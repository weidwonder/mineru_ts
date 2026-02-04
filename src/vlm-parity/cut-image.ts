import { cutImage, ImageWriter } from './pdf-image-tools';

export function checkImgBbox(bbox: [number, number, number, number]): boolean {
  if (bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) {
    return false;
  }
  return true;
}

export function cutImageAndTable(
  span: any,
  pageImage: { rgbBuffer: Buffer; width: number; height: number },
  pageImgMd5: string,
  pageId: number,
  imageWriter: ImageWriter | null,
  scale: number = 2
) {
  const returnPath = (pathType: string) => `${pathType}/${pageImgMd5}`;
  const spanType = span.type;

  if (!checkImgBbox(span.bbox) || !imageWriter) {
    span.image_path = '';
  } else {
    span.image_path = cutImage(span.bbox, pageId, pageImage, returnPath(spanType), imageWriter, scale);
  }

  return span;
}
