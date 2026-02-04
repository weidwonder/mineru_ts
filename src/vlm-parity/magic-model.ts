import { calculateOverlapAreaInBbox1AreaRatio } from './boxbase';
import { BlockType, ContentType } from './enum';
import { detectLang } from './language';
import { reductOverlap, tieUpCategoryByIndex } from './magic-model-utils';

type BBox = [number, number, number, number];

type Span = {
  bbox: BBox;
  type: string;
  content?: string | null;
  html?: string;
};

type Line = {
  bbox: BBox;
  spans: Span[];
  extra?: { type?: string; guess_lang?: string };
};

type Block = {
  bbox: BBox;
  type: string;
  angle: number;
  lines?: Line[];
  index: number;
  blocks?: any[];
  sub_type?: string;
  guess_lang?: string;
};

function isolatedFormulaClean(txt: string): string {
  let latex = txt.slice();
  if (latex.startsWith('\\[')) {
    latex = latex.slice(2);
  }
  if (latex.endsWith('\\]')) {
    latex = latex.slice(0, -2);
  }
  return latex.trim();
}

function codeContentClean(content: string | null | undefined): string {
  if (!content) {
    return '';
  }
  const lines = content.split(/\r?\n/);
  let startIdx = 0;
  let endIdx = lines.length;

  if (lines.length > 0 && lines[0].startsWith('```')) {
    startIdx = 1;
  }
  if (lines.length > 0 && endIdx > startIdx && lines[endIdx - 1].trim() === '```') {
    endIdx -= 1;
  }

  if (startIdx < endIdx) {
    return lines.slice(startIdx, endIdx).join('\n').trim();
  }
  return '';
}

function cleanContent(content: string | null | undefined): string {
  if (!content) {
    return '';
  }
  if (content.split('\\[').length - 1 === content.split('\\]').length - 1 && content.split('\\[').length - 1 > 0) {
    const pattern = /\\\[(.*?)\\\]/g;
    return content.replace(pattern, (_match, inner) => `[${inner}]`);
  }
  return content;
}

function guessLanguageByText(content: string): string {
  if (!content) {
    return 'txt';
  }
  const lang = detectLang(content);
  return lang || 'txt';
}

function tieUpCategoryByIndexWrapper(blocks: Block[], subjectBlockType: string, objectBlockType: string) {
  const getSubjects = () =>
    reductOverlap(
      blocks
        .filter((x) => x.type === subjectBlockType)
        .map((x) => ({ bbox: x.bbox, lines: x.lines, index: x.index, angle: x.angle }))
    );

  const getObjects = () =>
    reductOverlap(
      blocks
        .filter((x) => x.type === objectBlockType)
        .map((x) => ({ bbox: x.bbox, lines: x.lines, index: x.index, angle: x.angle }))
    );

  return tieUpCategoryByIndex(getSubjects, getObjects);
}

function getTypeBlocks(blocks: Block[], blockType: 'image' | 'table' | 'code') {
  const withCaptions = tieUpCategoryByIndexWrapper(blocks, `${blockType}_body`, `${blockType}_caption`);
  const withFootnotes = tieUpCategoryByIndexWrapper(blocks, `${blockType}_body`, `${blockType}_footnote`);
  const ret: any[] = [];

  for (const v of withCaptions) {
    const record: any = {
      [`${blockType}_body`]: v.sub_bbox,
      [`${blockType}_caption_list`]: v.obj_bboxes,
    };
    const filterIdx = v.sub_idx;
    const d = withFootnotes.find((item: any) => item.sub_idx === filterIdx);
    record[`${blockType}_footnote_list`] = d ? d.obj_bboxes : [];
    ret.push(record);
  }
  return ret;
}

function fixTwoLayerBlocks(blocks: Block[], fixType: 'image' | 'table' | 'code') {
  const needFixBlocks = getTypeBlocks(blocks, fixType);
  const fixedBlocks: any[] = [];
  const notIncludeBlocks: any[] = [];
  const processedIndices = new Set<number>();

  if (fixType === 'table' || fixType === 'image') {
    const misplacedFootnotes: Array<[any, number]> = [];

    for (let blockIdx = 0; blockIdx < needFixBlocks.length; blockIdx += 1) {
      const block = needFixBlocks[blockIdx];
      const body = block[`${fixType}_body`];
      const bodyIndex = body.index;
      const validFootnotes: any[] = [];
      for (const footnote of block[`${fixType}_footnote_list`]) {
        if (footnote.index >= bodyIndex) {
          validFootnotes.push(footnote);
        } else {
          misplacedFootnotes.push([footnote, blockIdx]);
        }
      }
      block[`${fixType}_footnote_list`] = validFootnotes;
    }

    for (const [footnote, originalBlockIdx] of misplacedFootnotes) {
      const footnoteIndex = footnote.index;
      let bestBlockIdx: number | null = null;
      let minDistance = Infinity;

      for (let idx = 0; idx < needFixBlocks.length; idx += 1) {
        const bodyIndex = needFixBlocks[idx][`${fixType}_body`].index;
        if (bodyIndex <= footnoteIndex && idx !== originalBlockIdx) {
          const distance = footnoteIndex - bodyIndex;
          if (distance < minDistance) {
            minDistance = distance;
            bestBlockIdx = idx;
          }
        }
      }

      if (bestBlockIdx !== null) {
        needFixBlocks[bestBlockIdx][`${fixType}_footnote_list`].push(footnote);
      } else {
        notIncludeBlocks.push(footnote);
      }
    }

    for (const block of needFixBlocks) {
      const captionList = block[`${fixType}_caption_list`];
      const footnoteList = block[`${fixType}_footnote_list`];
      const bodyIndex = block[`${fixType}_body`].index;

      if (captionList && captionList.length > 0) {
        captionList.sort((a: any, b: any) => b.index - a.index);
        const filteredCaptions = [captionList[0]];
        for (let i = 1; i < captionList.length; i += 1) {
          const prevIndex = captionList[i - 1].index;
          const currIndex = captionList[i].index;
          if (currIndex === prevIndex - 1) {
            filteredCaptions.push(captionList[i]);
          } else {
            const gapIndices = new Set<number>();
            for (let idx = currIndex + 1; idx < prevIndex; idx += 1) {
              gapIndices.add(idx);
            }
            if (gapIndices.size === 1 && gapIndices.has(bodyIndex)) {
              filteredCaptions.push(captionList[i]);
            } else {
              notIncludeBlocks.push(...captionList.slice(i));
              break;
            }
          }
        }
        filteredCaptions.reverse();
        block[`${fixType}_caption_list`] = filteredCaptions;
      }

      if (footnoteList && footnoteList.length > 0) {
        footnoteList.sort((a: any, b: any) => a.index - b.index);
        const filteredFootnotes = [footnoteList[0]];
        for (let i = 1; i < footnoteList.length; i += 1) {
          if (footnoteList[i].index === footnoteList[i - 1].index + 1) {
            filteredFootnotes.push(footnoteList[i]);
          } else {
            notIncludeBlocks.push(...footnoteList.slice(i));
            break;
          }
        }
        block[`${fixType}_footnote_list`] = filteredFootnotes;
      }
    }
  }

  for (const block of needFixBlocks) {
    const body = block[`${fixType}_body`];
    const captionList = block[`${fixType}_caption_list`];
    const footnoteList = block[`${fixType}_footnote_list`];

    body.type = `${fixType}_body`;
    for (const caption of captionList) {
      caption.type = `${fixType}_caption`;
      processedIndices.add(caption.index);
    }
    for (const footnote of footnoteList) {
      footnote.type = `${fixType}_footnote`;
      processedIndices.add(footnote.index);
    }

    processedIndices.add(body.index);

    const twoLayerBlock: any = {
      type: fixType,
      bbox: body.bbox,
      blocks: [body],
      index: body.index,
    };
    twoLayerBlock.blocks.push(...captionList, ...footnoteList);
    twoLayerBlock.blocks.sort((a: any, b: any) => a.index - b.index);

    fixedBlocks.push(twoLayerBlock);
  }

  for (const block of blocks) {
    delete (block as any).type;
    if (!processedIndices.has(block.index) && !notIncludeBlocks.includes(block)) {
      notIncludeBlocks.push(block);
    }
  }

  return [fixedBlocks, notIncludeBlocks] as const;
}

function fixListBlocks(listBlocks: Block[], textBlocks: Block[], refTextBlocks: Block[]) {
  for (const listBlock of listBlocks) {
    listBlock.blocks = [];
    if ('lines' in listBlock) {
      delete listBlock.lines;
    }
  }

  const tempTextBlocks = textBlocks.concat(refTextBlocks);
  const needRemoveBlocks: Block[] = [];

  for (const block of tempTextBlocks) {
    for (const listBlock of listBlocks) {
      if (calculateOverlapAreaInBbox1AreaRatio(block.bbox, listBlock.bbox) >= 0.8) {
        (listBlock.blocks as Block[]).push(block);
        needRemoveBlocks.push(block);
        break;
      }
    }
  }

  for (const block of needRemoveBlocks) {
    const idxText = textBlocks.indexOf(block);
    if (idxText >= 0) {
      textBlocks.splice(idxText, 1);
      continue;
    }
    const idxRef = refTextBlocks.indexOf(block);
    if (idxRef >= 0) {
      refTextBlocks.splice(idxRef, 1);
    }
  }

  const filteredListBlocks = listBlocks.filter((lb) => (lb.blocks as Block[]).length > 0);

  for (const listBlock of filteredListBlocks) {
    const typeCount: Record<string, number> = {};
    for (const subBlock of listBlock.blocks as Block[]) {
      const subType = subBlock.type;
      typeCount[subType] = (typeCount[subType] || 0) + 1;
    }
    if (Object.keys(typeCount).length > 0) {
      let bestType = 'unknown';
      let bestCount = -1;
      for (const [key, value] of Object.entries(typeCount)) {
        if (value > bestCount) {
          bestCount = value;
          bestType = key;
        }
      }
      listBlock.sub_type = bestType;
    } else {
      listBlock.sub_type = 'unknown';
    }
  }

  return [filteredListBlocks, textBlocks, refTextBlocks] as const;
}

export class MagicModel {
  private pageBlocks: any[];
  private imageBlocks: any[] = [];
  private tableBlocks: any[] = [];
  private interlineEquationBlocks: any[] = [];
  private textBlocks: any[] = [];
  private titleBlocks: any[] = [];
  private codeBlocks: any[] = [];
  private discardedBlocks: any[] = [];
  private refTextBlocks: any[] = [];
  private phoneticBlocks: any[] = [];
  private listBlocks: any[] = [];
  private allSpans: any[] = [];

  constructor(pageBlocks: any[], width: number, height: number) {
    this.pageBlocks = pageBlocks;

    const blocks: Block[] = [];

    for (let index = 0; index < pageBlocks.length; index += 1) {
      const blockInfo = pageBlocks[index];
      let blockBbox: BBox = blockInfo.bbox;
      try {
        let [x1, y1, x2, y2] = blockBbox;
        let x_1 = Math.trunc(x1 * width);
        let y_1 = Math.trunc(y1 * height);
        let x_2 = Math.trunc(x2 * width);
        let y_2 = Math.trunc(y2 * height);
        if (x_2 < x_1) {
          [x_1, x_2] = [x_2, x_1];
        }
        if (y_2 < y_1) {
          [y_1, y_2] = [y_2, y_1];
        }
        blockBbox = [x_1, y_1, x_2, y_2];
      } catch (error) {
        continue;
      }

      let blockType = blockInfo.type;
      let blockContent = blockInfo.content;
      const blockAngle = blockInfo.angle;

      let spanType: string = 'unknown';
      let codeBlockSubType: string | null = null;
      let guessLang: string | null = null;

      if (
        [
          'text',
          'title',
          'image_caption',
          'image_footnote',
          'table_caption',
          'table_footnote',
          'code_caption',
          'ref_text',
          'phonetic',
          'header',
          'footer',
          'page_number',
          'aside_text',
          'page_footnote',
          'list',
        ].includes(blockType)
      ) {
        spanType = ContentType.TEXT;
      } else if (blockType === 'image') {
        blockType = BlockType.IMAGE_BODY;
        spanType = ContentType.IMAGE;
      } else if (blockType === 'table') {
        blockType = BlockType.TABLE_BODY;
        spanType = ContentType.TABLE;
      } else if (blockType === 'code' || blockType === 'algorithm') {
        blockContent = codeContentClean(blockContent);
        codeBlockSubType = blockType;
        blockType = BlockType.CODE_BODY;
        spanType = ContentType.TEXT;
        guessLang = guessLanguageByText(blockContent || '');
      } else if (blockType === 'equation') {
        blockType = BlockType.INTERLINE_EQUATION;
        spanType = ContentType.INTERLINE_EQUATION;
      }

      let switchCodeToAlgorithm = false;
      let span: Span | Span[];

      if (spanType === ContentType.IMAGE || spanType === ContentType.TABLE) {
        span = { bbox: blockBbox, type: spanType };
        if (spanType === ContentType.TABLE) {
          const tableHtml = (blockInfo as any).html ?? blockContent ?? '';
          (span as Span).html = tableHtml;
        }
      } else if (spanType === ContentType.INTERLINE_EQUATION) {
        span = {
          bbox: blockBbox,
          type: spanType,
          content: isolatedFormulaClean(blockContent || ''),
        };
      } else {
        if (blockContent) {
          blockContent = cleanContent(blockContent);
        }

        if (
          blockContent &&
          blockContent.split('\\(').length - 1 === blockContent.split('\\)').length - 1 &&
          blockContent.split('\\(').length - 1 > 0
        ) {
          switchCodeToAlgorithm = true;
          const spans: Span[] = [];
          let lastEnd = 0;
          const regex = /\\\((.+?)\\\)/g;
          let match: RegExpExecArray | null;
          while ((match = regex.exec(blockContent)) !== null) {
            const start = match.index;
            const end = start + match[0].length;

            if (start > lastEnd) {
              const textBefore = blockContent.slice(lastEnd, start);
              if (textBefore.trim()) {
                spans.push({ bbox: blockBbox, type: ContentType.TEXT, content: textBefore });
              }
            }

            const formula = match[1];
            spans.push({ bbox: blockBbox, type: ContentType.INLINE_EQUATION, content: formula.trim() });

            lastEnd = end;
          }

          if (lastEnd < blockContent.length) {
            const textAfter = blockContent.slice(lastEnd);
            if (textAfter.trim()) {
              spans.push({ bbox: blockBbox, type: ContentType.TEXT, content: textAfter });
            }
          }

          span = spans;
        } else {
          span = { bbox: blockBbox, type: spanType, content: blockContent || '' };
        }
      }

      let spans: Span[];
      if (!Array.isArray(span)) {
        this.allSpans.push(span);
        spans = [span];
      } else {
        this.allSpans.push(...span);
        spans = span;
      }

      let line: Line;
      if (blockType === BlockType.CODE_BODY) {
        if (switchCodeToAlgorithm && codeBlockSubType === 'code') {
          codeBlockSubType = 'algorithm';
        }
        line = { bbox: blockBbox, spans, extra: { type: codeBlockSubType || undefined, guess_lang: guessLang || undefined } };
      } else {
        line = { bbox: blockBbox, spans };
      }

      blocks.push({
        bbox: blockBbox,
        type: blockType,
        angle: blockAngle,
        lines: [line],
        index,
      });
    }

    const imageTypes = [BlockType.IMAGE_BODY, BlockType.IMAGE_CAPTION, BlockType.IMAGE_FOOTNOTE] as string[];
    const tableTypes = [BlockType.TABLE_BODY, BlockType.TABLE_CAPTION, BlockType.TABLE_FOOTNOTE] as string[];
    const codeTypes = [BlockType.CODE_BODY, BlockType.CODE_CAPTION] as string[];
    const discardedTypes = [
      BlockType.HEADER,
      BlockType.FOOTER,
      BlockType.PAGE_NUMBER,
      BlockType.ASIDE_TEXT,
      BlockType.PAGE_FOOTNOTE,
    ] as string[];

    for (const block of blocks) {
      if (imageTypes.includes(block.type)) {
        this.imageBlocks.push(block);
      } else if (tableTypes.includes(block.type)) {
        this.tableBlocks.push(block);
      } else if (codeTypes.includes(block.type)) {
        this.codeBlocks.push(block);
      } else if (block.type === BlockType.INTERLINE_EQUATION) {
        this.interlineEquationBlocks.push(block);
      } else if (block.type === BlockType.TEXT) {
        this.textBlocks.push(block);
      } else if (block.type === BlockType.TITLE) {
        this.titleBlocks.push(block);
      } else if (block.type === BlockType.REF_TEXT) {
        this.refTextBlocks.push(block);
      } else if (block.type === BlockType.PHONETIC) {
        this.phoneticBlocks.push(block);
      } else if (discardedTypes.includes(block.type)) {
        this.discardedBlocks.push(block);
      } else if (block.type === BlockType.LIST) {
        this.listBlocks.push(block);
      }
    }

    const [listBlocksFixed, textBlocksFixed, refTextBlocksFixed] = fixListBlocks(
      this.listBlocks,
      this.textBlocks,
      this.refTextBlocks
    );
    this.listBlocks = listBlocksFixed;
    this.textBlocks = textBlocksFixed;
    this.refTextBlocks = refTextBlocksFixed;

    const [imageBlocksFixed, notIncludeImageBlocks] = fixTwoLayerBlocks(this.imageBlocks, BlockType.IMAGE);
    const [tableBlocksFixed, notIncludeTableBlocks] = fixTwoLayerBlocks(this.tableBlocks, BlockType.TABLE);
    const [codeBlocksFixed, notIncludeCodeBlocks] = fixTwoLayerBlocks(this.codeBlocks, BlockType.CODE);

    this.imageBlocks = imageBlocksFixed;
    this.tableBlocks = tableBlocksFixed;
    this.codeBlocks = codeBlocksFixed;

    for (const codeBlock of this.codeBlocks) {
      for (const block of codeBlock.blocks || []) {
        if (block.type === BlockType.CODE_BODY) {
          if (block.lines && block.lines.length > 0) {
            const line = block.lines[0];
            codeBlock.sub_type = line.extra?.type;
            if (codeBlock.sub_type === 'code') {
              codeBlock.guess_lang = line.extra?.guess_lang;
            }
            if (line.extra) {
              delete line.extra;
            }
          } else {
            codeBlock.sub_type = 'code';
            codeBlock.guess_lang = 'txt';
          }
        }
      }
    }

    for (const block of [...notIncludeImageBlocks, ...notIncludeTableBlocks, ...notIncludeCodeBlocks]) {
      block.type = BlockType.TEXT;
      this.textBlocks.push(block);
    }
  }

  getListBlocks() {
    return this.listBlocks;
  }

  getImageBlocks() {
    return this.imageBlocks;
  }

  getTableBlocks() {
    return this.tableBlocks;
  }

  getCodeBlocks() {
    return this.codeBlocks;
  }

  getRefTextBlocks() {
    return this.refTextBlocks;
  }

  getPhoneticBlocks() {
    return this.phoneticBlocks;
  }

  getTitleBlocks() {
    return this.titleBlocks;
  }

  getTextBlocks() {
    return this.textBlocks;
  }

  getInterlineEquationBlocks() {
    return this.interlineEquationBlocks;
  }

  getDiscardedBlocks() {
    return this.discardedBlocks;
  }

  getAllSpans() {
    return this.allSpans;
  }
}
