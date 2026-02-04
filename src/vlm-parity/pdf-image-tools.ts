import { PDFiumLibrary, PDFiumDocument } from '@hyzyla/pdfium';
import { pageToImage, imageToBytes, PdfPageImage } from './pdf-reader';
import { strSha256 } from './hash-utils';

export type ImageWriter = {
  write: (path: string, data: Buffer) => Promise<void> | void;
};

export async function loadImagesFromPdfBytes(
  pdfBytes: Buffer,
  dpi: number = 200,
  startPageId: number = 0,
  endPageId: number | null = null
): Promise<{ images: PdfPageImage[]; pdfDoc: PDFiumDocument; pdfLib: PDFiumLibrary }> {
  const pdfLib = await PDFiumLibrary.init();
  const pdfDoc = await pdfLib.loadDocument(pdfBytes);
  const pageCount = pdfDoc.getPageCount();

  const end = endPageId !== null && endPageId >= 0 ? endPageId : pageCount - 1;
  const finalEnd = Math.min(end, pageCount - 1);

  const images: PdfPageImage[] = [];
  for (let index = startPageId; index <= finalEnd; index += 1) {
    const page = pdfDoc.getPage(index);
    const image = pageToImage(page, dpi, 3500);
    images.push(image);
  }

  return { images, pdfDoc, pdfLib };
}

export function getCropImg(
  bbox: [number, number, number, number],
  pageImage: { rgbBuffer: Buffer; width: number; height: number },
  scale: number = 2
): { rgbBuffer: Buffer; width: number; height: number } {
  const x0 = Math.trunc(bbox[0] * scale);
  const y0 = Math.trunc(bbox[1] * scale);
  const x1 = Math.trunc(bbox[2] * scale);
  const y1 = Math.trunc(bbox[3] * scale);

  const cropX0 = Math.max(0, Math.min(pageImage.width, x0));
  const cropY0 = Math.max(0, Math.min(pageImage.height, y0));
  const cropX1 = Math.max(0, Math.min(pageImage.width, x1));
  const cropY1 = Math.max(0, Math.min(pageImage.height, y1));

  const cropWidth = Math.max(0, cropX1 - cropX0);
  const cropHeight = Math.max(0, cropY1 - cropY0);
  const cropBuffer = Buffer.alloc(cropWidth * cropHeight * 3);

  const srcRowBytes = pageImage.width * 3;
  const dstRowBytes = cropWidth * 3;

  for (let row = 0; row < cropHeight; row += 1) {
    const srcStart = (cropY0 + row) * srcRowBytes + cropX0 * 3;
    const dstStart = row * dstRowBytes;
    pageImage.rgbBuffer.copy(cropBuffer, dstStart, srcStart, srcStart + dstRowBytes);
  }

  return { rgbBuffer: cropBuffer, width: cropWidth, height: cropHeight };
}

export function cutImage(
  bbox: [number, number, number, number],
  pageNum: number,
  pageImage: { rgbBuffer: Buffer; width: number; height: number },
  returnPath: string | null,
  imageWriter: ImageWriter | null,
  scale: number = 2
): string {
  const filename = `${pageNum}_${Math.trunc(bbox[0])}_${Math.trunc(bbox[1])}_${Math.trunc(bbox[2])}_${Math.trunc(bbox[3])}`;
  const imgPath = returnPath ? `${returnPath}_${filename}` : '';
  const imgHashPath = `${strSha256(imgPath)}.jpg`;

  const cropImg = getCropImg(bbox, pageImage, scale);
  const imgBytes = imageToBytes(cropImg, 0.75);

  if (imageWriter && imgPath) {
    imageWriter.write(imgHashPath, imgBytes);
  }

  return imgHashPath;
}
