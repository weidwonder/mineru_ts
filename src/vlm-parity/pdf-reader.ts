import { createCanvas, ImageData } from 'canvas';
import { FPDFBitmap, FPDFRenderFlag } from '@hyzyla/pdfium/dist/constants';
import type { PDFiumPage } from '@hyzyla/pdfium';

export type PdfPageImage = {
  rgbBuffer: Buffer;
  width: number;
  height: number;
  scale: number;
};

export function pageToImage(
  page: PDFiumPage,
  dpi: number = 200,
  maxWidthOrHeight: number = 3500
): PdfPageImage {
  const size = page.getSize(true);
  let scale = dpi / 72;
  const longSide = Math.max(size.width, size.height);
  if (longSide * scale > maxWidthOrHeight) {
    scale = maxWidthOrHeight / longSide;
  }

  const width = Math.ceil(size.width * scale);
  const height = Math.ceil(size.height * scale);

  const module = (page as any).module;
  const pageIdx = (page as any).pageIdx;
  const bytesPerPixel = 3;
  const stride = width * bytesPerPixel;
  const buffSize = stride * height;

  const ptr = module.wasmExports.malloc(buffSize);
  module.HEAPU8.fill(0, ptr, ptr + buffSize);

  const bitmap = module._FPDFBitmap_CreateEx(width, height, FPDFBitmap.BGR, ptr, stride);
  module._FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xffffffff);
  module._FPDF_RenderPageBitmap(bitmap, pageIdx, 0, 0, width, height, 0, FPDFRenderFlag.ANNOT);
  module._FPDFBitmap_Destroy(bitmap);
  module._FPDF_ClosePage(pageIdx);

  const bgrBuffer = Buffer.from(module.HEAPU8.subarray(ptr, ptr + buffSize));
  module.wasmExports.free(ptr);

  const rgbBuffer = Buffer.alloc(width * height * 3);
  for (let i = 0, j = 0; i < bgrBuffer.length; i += 3, j += 3) {
    rgbBuffer[j] = bgrBuffer[i + 2];
    rgbBuffer[j + 1] = bgrBuffer[i + 1];
    rgbBuffer[j + 2] = bgrBuffer[i];
  }

  return { rgbBuffer, width, height, scale };
}

export function imageToBytes(
  image: { rgbBuffer: Buffer; width: number; height: number },
  quality: number = 0.75
): Buffer {
  const { rgbBuffer, width, height } = image;
  const rgbaBuffer = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < rgbBuffer.length; i += 3, j += 4) {
    rgbaBuffer[j] = rgbBuffer[i];
    rgbaBuffer[j + 1] = rgbBuffer[i + 1];
    rgbaBuffer[j + 2] = rgbBuffer[i + 2];
    rgbaBuffer[j + 3] = 255;
  }
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(new Uint8ClampedArray(rgbaBuffer), width, height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toBuffer('image/jpeg', { quality });
}
