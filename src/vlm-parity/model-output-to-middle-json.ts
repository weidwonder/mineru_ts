import { MagicModel } from './magic-model';
import { ContentType } from './enum';
import { bytesMd5Upper } from './hash-utils';
import { cutImageAndTable } from './cut-image';
import type { PdfPageImage } from './pdf-reader';
import type { ImageWriter } from './pdf-image-tools';
import { mergeTable } from './table-merge';

const VERSION_NAME = '2.7.1';

function getTableEnable(defaultEnable: boolean): boolean {
  const env = process.env.MINERU_TABLE_ENABLE;
  if (env === undefined) {
    return defaultEnable;
  }
  return env.toLowerCase() === 'true';
}

function crossPageTableMerge(pdfInfo: any[]): void {
  const env = process.env.MINERU_TABLE_MERGE_ENABLE ?? 'true';
  const enable = env.toLowerCase();
  if (enable === 'true' || enable === '1' || enable === 'yes') {
    mergeTable(pdfInfo);
  }
}

export function blocksToPageInfo(
  pageBlocks: any[],
  imageDict: PdfPageImage,
  page: any,
  imageWriter: ImageWriter | null,
  pageIndex: number
): any {
  const scale = imageDict.scale;
  const pageImgMd5 = bytesMd5Upper(imageDict.rgbBuffer);

  const size = page.getSize(true);
  const width = Math.trunc(size.width);
  const height = Math.trunc(size.height);

  const magicModel = new MagicModel(pageBlocks, width, height);
  const imageBlocks = magicModel.getImageBlocks();
  const tableBlocks = magicModel.getTableBlocks();
  const titleBlocks = magicModel.getTitleBlocks();
  const discardedBlocks = magicModel.getDiscardedBlocks();
  const codeBlocks = magicModel.getCodeBlocks();
  const refTextBlocks = magicModel.getRefTextBlocks();
  const phoneticBlocks = magicModel.getPhoneticBlocks();
  const listBlocks = magicModel.getListBlocks();
  const textBlocks = magicModel.getTextBlocks();
  const interlineEquationBlocks = magicModel.getInterlineEquationBlocks();

  const allSpans = magicModel.getAllSpans();
  for (const span of allSpans) {
    if (
      span.type === ContentType.IMAGE ||
      span.type === ContentType.TABLE ||
      span.type === ContentType.INTERLINE_EQUATION
    ) {
      cutImageAndTable(span, imageDict, pageImgMd5, pageIndex, imageWriter, scale);
    }
  }

  const mergedBlocks = [
    ...imageBlocks,
    ...tableBlocks,
    ...codeBlocks,
    ...refTextBlocks,
    ...phoneticBlocks,
    ...titleBlocks,
    ...textBlocks,
    ...interlineEquationBlocks,
    ...listBlocks,
  ];
  mergedBlocks.sort((a: any, b: any) => a.index - b.index);

  return {
    para_blocks: mergedBlocks,
    discarded_blocks: discardedBlocks,
    page_size: [width, height],
    page_idx: pageIndex,
  };
}

export function resultToMiddleJson(
  modelOutputBlocksList: any[],
  imagesList: PdfPageImage[],
  pdfDoc: any,
  imageWriter: ImageWriter | null
) {
  const middleJson: any = { pdf_info: [], _backend: 'vlm', _version_name: VERSION_NAME };

  for (let index = 0; index < modelOutputBlocksList.length; index += 1) {
    const pageBlocks = modelOutputBlocksList[index];
    const page = pdfDoc.getPage ? pdfDoc.getPage(index) : null;
    const imageDict = imagesList[index];
    if (!page || !imageDict) {
      continue;
    }
    const pageInfo = blocksToPageInfo(pageBlocks, imageDict, page, imageWriter, index);
    middleJson.pdf_info.push(pageInfo);
  }

  const tableEnableDefault = (process.env.MINERU_VLM_TABLE_ENABLE ?? 'True').toLowerCase() === 'true';
  const tableEnable = getTableEnable(tableEnableDefault);
  if (tableEnable) {
    crossPageTableMerge(middleJson.pdf_info);
  }

  return middleJson;
}
