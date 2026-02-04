import fs from 'fs';
import os from 'os';
import path from 'path';
import { BlockType, ContentType, ContentTypeV2, MakeMode } from './enum';
import { fullToHalfExcludeMarks, isHyphenAtLineEnd } from './char-utils';
import { detectLang } from './language';

type DelimiterConfig = {
  display: { left: string; right: string };
  inline: { left: string; right: string };
};

const CONFIG_FILE_NAME = process.env.MINERU_TOOLS_CONFIG_JSON ?? 'mineru.json';

function readConfig(): Record<string, any> | null {
  const configFile = path.isAbsolute(CONFIG_FILE_NAME)
    ? CONFIG_FILE_NAME
    : path.join(os.homedir(), CONFIG_FILE_NAME);
  if (!fs.existsSync(configFile)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(configFile, 'utf-8');
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    return null;
  }
}

function getLatexDelimiterConfig(): DelimiterConfig | null {
  const config = readConfig();
  if (!config) {
    return null;
  }
  return (config['latex-delimiter-config'] as DelimiterConfig) ?? null;
}

function getFormulaEnable(formulaEnable: boolean): boolean {
  const env = process.env.MINERU_FORMULA_ENABLE;
  if (env === undefined) {
    return formulaEnable;
  }
  return env.toLowerCase() === 'true';
}

function getTableEnable(tableEnable: boolean): boolean {
  const env = process.env.MINERU_TABLE_ENABLE;
  if (env === undefined) {
    return tableEnable;
  }
  return env.toLowerCase() === 'true';
}

const defaultDelimiters: DelimiterConfig = {
  display: { left: '$$', right: '$$' },
  inline: { left: '$', right: '$' },
};

const delimiters = getLatexDelimiterConfig() ?? defaultDelimiters;
const displayLeftDelimiter = delimiters.display.left;
const displayRightDelimiter = delimiters.display.right;
const inlineLeftDelimiter = delimiters.inline.left;
const inlineRightDelimiter = delimiters.inline.right;

function isLowerAlpha(value: string): boolean {
  return value >= 'a' && value <= 'z';
}

export function mergeParaWithText(
  paraBlock: any,
  formulaEnable: boolean = true,
  imgBucketPath: string = ''
): string {
  let blockText = '';
  for (const line of paraBlock.lines || []) {
    for (const span of line.spans || []) {
      if (span.type === ContentType.TEXT) {
        span.content = fullToHalfExcludeMarks(span.content);
        blockText += span.content;
      }
    }
  }
  const blockLang = detectLang(blockText);

  let paraText = '';
  for (let i = 0; i < (paraBlock.lines || []).length; i += 1) {
    const line = paraBlock.lines[i];
    for (let j = 0; j < (line.spans || []).length; j += 1) {
      const span = line.spans[j];
      const spanType = span.type;
      let content = '';
      if (spanType === ContentType.TEXT) {
        content = span.content;
      } else if (spanType === ContentType.INLINE_EQUATION) {
        content = `${inlineLeftDelimiter}${span.content}${inlineRightDelimiter}`;
      } else if (spanType === ContentType.INTERLINE_EQUATION) {
        if (formulaEnable) {
          content = `\n${displayLeftDelimiter}\n${span.content}\n${displayRightDelimiter}\n`;
        } else if (span.image_path) {
          content = `![](${imgBucketPath}/${span.image_path})`;
        }
      }

      content = content.trim();
      if (!content) {
        continue;
      }

      if (spanType === ContentType.INTERLINE_EQUATION) {
        paraText += content;
        continue;
      }

      const cjkLangs = new Set(['zh', 'ja', 'ko']);
      const isLastSpan = j === line.spans.length - 1;

      if (cjkLangs.has(blockLang)) {
        if (isLastSpan && spanType !== ContentType.INLINE_EQUATION) {
          paraText += content;
        } else {
          paraText += `${content} `;
        }
      } else {
        if (spanType === ContentType.TEXT || spanType === ContentType.INLINE_EQUATION) {
          if (
            isLastSpan &&
            spanType === ContentType.TEXT &&
            isHyphenAtLineEnd(content)
          ) {
            if (
              i + 1 < paraBlock.lines.length &&
              paraBlock.lines[i + 1].spans &&
              paraBlock.lines[i + 1].spans[0]?.type === ContentType.TEXT &&
              paraBlock.lines[i + 1].spans[0]?.content &&
              isLowerAlpha(paraBlock.lines[i + 1].spans[0].content[0])
            ) {
              paraText += content.slice(0, -1);
            } else {
              paraText += content;
            }
          } else {
            paraText += `${content} `;
          }
        }
      }
    }
  }
  return paraText;
}

function getTitleLevel(block: any): number {
  let titleLevel = block.level ?? 1;
  if (titleLevel > 4) {
    titleLevel = 4;
  } else if (titleLevel < 1) {
    titleLevel = 0;
  }
  return titleLevel;
}

export function mkBlocksToMarkdown(
  paraBlocks: any[],
  makeMode: string,
  formulaEnable: boolean,
  tableEnable: boolean,
  imgBucketPath: string = ''
): string[] {
  const pageMarkdown: string[] = [];
  for (const paraBlock of paraBlocks) {
    let paraText = '';
    const paraType = paraBlock.type;
    if (
      paraType === BlockType.TEXT ||
      paraType === BlockType.INTERLINE_EQUATION ||
      paraType === BlockType.PHONETIC ||
      paraType === BlockType.REF_TEXT
    ) {
      paraText = mergeParaWithText(paraBlock, formulaEnable, imgBucketPath);
    } else if (paraType === BlockType.LIST) {
      for (const block of paraBlock.blocks || []) {
        const itemText = mergeParaWithText(block, formulaEnable, imgBucketPath);
        paraText += `${itemText}  \n`;
      }
    } else if (paraType === BlockType.TITLE) {
      const titleLevel = getTitleLevel(paraBlock);
      paraText = `${'#'.repeat(titleLevel)} ${mergeParaWithText(paraBlock)}`;
    } else if (paraType === BlockType.IMAGE) {
      if (makeMode === MakeMode.NLP_MD) {
        continue;
      }
      if (makeMode === MakeMode.MM_MD) {
        const hasImageFootnote = (paraBlock.blocks || []).some(
          (block: any) => block.type === BlockType.IMAGE_FOOTNOTE
        );
        if (hasImageFootnote) {
          for (const block of paraBlock.blocks || []) {
            if (block.type === BlockType.IMAGE_CAPTION) {
              paraText += `${mergeParaWithText(block)}  \n`;
            }
          }
          for (const block of paraBlock.blocks || []) {
            if (block.type === BlockType.IMAGE_BODY) {
              for (const line of block.lines || []) {
                for (const span of line.spans || []) {
                  if (span.type === ContentType.IMAGE && span.image_path) {
                    paraText += `![](${imgBucketPath}/${span.image_path})`;
                  }
                }
              }
            }
          }
          for (const block of paraBlock.blocks || []) {
            if (block.type === BlockType.IMAGE_FOOTNOTE) {
              paraText += `  \n${mergeParaWithText(block)}`;
            }
          }
        } else {
          for (const block of paraBlock.blocks || []) {
            if (block.type === BlockType.IMAGE_BODY) {
              for (const line of block.lines || []) {
                for (const span of line.spans || []) {
                  if (span.type === ContentType.IMAGE && span.image_path) {
                    paraText += `![](${imgBucketPath}/${span.image_path})`;
                  }
                }
              }
            }
          }
          for (const block of paraBlock.blocks || []) {
            if (block.type === BlockType.IMAGE_CAPTION) {
              paraText += `  \n${mergeParaWithText(block)}`;
            }
          }
        }
      }
    } else if (paraType === BlockType.TABLE) {
      if (makeMode === MakeMode.NLP_MD) {
        continue;
      }
      if (makeMode === MakeMode.MM_MD) {
        for (const block of paraBlock.blocks || []) {
          if (block.type === BlockType.TABLE_CAPTION) {
            paraText += `${mergeParaWithText(block)}  \n`;
          }
        }
        for (const block of paraBlock.blocks || []) {
          if (block.type === BlockType.TABLE_BODY) {
            for (const line of block.lines || []) {
              for (const span of line.spans || []) {
                if (span.type === ContentType.TABLE) {
                  if (tableEnable) {
                    if (span.html) {
                      paraText += `\n${span.html}\n`;
                    } else if (span.image_path) {
                      paraText += `![](${imgBucketPath}/${span.image_path})`;
                    }
                  } else if (span.image_path) {
                    paraText += `![](${imgBucketPath}/${span.image_path})`;
                  }
                }
              }
            }
          }
        }
        for (const block of paraBlock.blocks || []) {
          if (block.type === BlockType.TABLE_FOOTNOTE) {
            paraText += `\n${mergeParaWithText(block)}  `;
          }
        }
      }
    } else if (paraType === BlockType.CODE) {
      const subType = paraBlock.sub_type;
      for (const block of paraBlock.blocks || []) {
        if (block.type === BlockType.CODE_CAPTION) {
          paraText += `${mergeParaWithText(block)}  \n`;
        }
      }
      for (const block of paraBlock.blocks || []) {
        if (block.type === BlockType.CODE_BODY) {
          if (subType === BlockType.CODE) {
            const guessLang = paraBlock.guess_lang;
            paraText += `\`\`\`${guessLang}\n${mergeParaWithText(block)}\n\`\`\``;
          } else if (subType === BlockType.ALGORITHM) {
            paraText += mergeParaWithText(block);
          }
        }
      }
    }

    if (paraText.trim() === '') {
      continue;
    }
    pageMarkdown.push(paraText.trim());
  }
  return pageMarkdown;
}

function makeBlocksToContentList(
  paraBlock: any,
  imgBucketPath: string,
  pageIdx: number,
  pageSize: [number, number]
): any {
  const paraType = paraBlock.type;
  let paraContent: any = {};
  if (
    paraType === BlockType.TEXT ||
    paraType === BlockType.REF_TEXT ||
    paraType === BlockType.PHONETIC ||
    paraType === BlockType.HEADER ||
    paraType === BlockType.FOOTER ||
    paraType === BlockType.PAGE_NUMBER ||
    paraType === BlockType.ASIDE_TEXT ||
    paraType === BlockType.PAGE_FOOTNOTE
  ) {
    paraContent = {
      type: paraType,
      text: mergeParaWithText(paraBlock),
    };
  } else if (paraType === BlockType.LIST) {
    paraContent = {
      type: paraType,
      sub_type: paraBlock.sub_type ?? '',
      list_items: [],
    };
    for (const block of paraBlock.blocks || []) {
      const itemText = mergeParaWithText(block);
      if (itemText.trim()) {
        paraContent.list_items.push(itemText);
      }
    }
  } else if (paraType === BlockType.TITLE) {
    const titleLevel = getTitleLevel(paraBlock);
    paraContent = {
      type: ContentType.TEXT,
      text: mergeParaWithText(paraBlock),
    };
    if (titleLevel !== 0) {
      paraContent.text_level = titleLevel;
    }
  } else if (paraType === BlockType.INTERLINE_EQUATION) {
    paraContent = {
      type: ContentType.EQUATION,
      text: mergeParaWithText(paraBlock),
      text_format: 'latex',
    };
  } else if (paraType === BlockType.IMAGE) {
    paraContent = {
      type: ContentType.IMAGE,
      img_path: '',
      [BlockType.IMAGE_CAPTION]: [],
      [BlockType.IMAGE_FOOTNOTE]: [],
    };
    for (const block of paraBlock.blocks || []) {
      if (block.type === BlockType.IMAGE_BODY) {
        for (const line of block.lines || []) {
          for (const span of line.spans || []) {
            if (span.type === ContentType.IMAGE && span.image_path) {
              paraContent.img_path = `${imgBucketPath}/${span.image_path}`;
            }
          }
        }
      }
      if (block.type === BlockType.IMAGE_CAPTION) {
        paraContent[BlockType.IMAGE_CAPTION].push(mergeParaWithText(block));
      }
      if (block.type === BlockType.IMAGE_FOOTNOTE) {
        paraContent[BlockType.IMAGE_FOOTNOTE].push(mergeParaWithText(block));
      }
    }
  } else if (paraType === BlockType.TABLE) {
    paraContent = {
      type: ContentType.TABLE,
      img_path: '',
      [BlockType.TABLE_CAPTION]: [],
      [BlockType.TABLE_FOOTNOTE]: [],
    };
    for (const block of paraBlock.blocks || []) {
      if (block.type === BlockType.TABLE_BODY) {
        for (const line of block.lines || []) {
          for (const span of line.spans || []) {
            if (span.type === ContentType.TABLE) {
              if (span.html) {
                paraContent[BlockType.TABLE_BODY] = `${span.html}`;
              }
              if (span.image_path) {
                paraContent.img_path = `${imgBucketPath}/${span.image_path}`;
              }
            }
          }
        }
      }
      if (block.type === BlockType.TABLE_CAPTION) {
        paraContent[BlockType.TABLE_CAPTION].push(mergeParaWithText(block));
      }
      if (block.type === BlockType.TABLE_FOOTNOTE) {
        paraContent[BlockType.TABLE_FOOTNOTE].push(mergeParaWithText(block));
      }
    }
  } else if (paraType === BlockType.CODE) {
    paraContent = {
      type: BlockType.CODE,
      sub_type: paraBlock.sub_type,
      [BlockType.CODE_CAPTION]: [],
    };
    for (const block of paraBlock.blocks || []) {
      if (block.type === BlockType.CODE_BODY) {
        paraContent[BlockType.CODE_BODY] = mergeParaWithText(block);
        if (paraBlock.sub_type === BlockType.CODE) {
          paraContent.guess_lang = paraBlock.guess_lang;
        }
      }
      if (block.type === BlockType.CODE_CAPTION) {
        paraContent[BlockType.CODE_CAPTION].push(mergeParaWithText(block));
      }
    }
  }

  const [pageWidth, pageHeight] = pageSize;
  const paraBbox = paraBlock.bbox;
  if (paraBbox) {
    const [x0, y0, x1, y1] = paraBbox;
    paraContent.bbox = [
      Math.trunc((x0 * 1000) / pageWidth),
      Math.trunc((y0 * 1000) / pageHeight),
      Math.trunc((x1 * 1000) / pageWidth),
      Math.trunc((y1 * 1000) / pageHeight),
    ];
  }

  paraContent.page_idx = pageIdx;
  return paraContent;
}

function getBodyData(paraBlock: any): [string, string] {
  const getDataFromSpans = (lines: any[]): [string, string] => {
    for (const line of lines || []) {
      for (const span of line.spans || []) {
        const spanType = span.type;
        if (spanType === ContentType.TABLE) {
          return [span.image_path ?? '', span.html ?? ''];
        }
        if (spanType === ContentType.IMAGE) {
          return [span.image_path ?? '', ''];
        }
        if (spanType === ContentType.INTERLINE_EQUATION) {
          return [span.image_path ?? '', span.content ?? ''];
        }
        if (spanType === ContentType.TEXT) {
          return ['', span.content ?? ''];
        }
      }
    }
    return ['', ''];
  };

  if (paraBlock.blocks) {
    for (const block of paraBlock.blocks || []) {
      const blockType = block.type;
      if (
        blockType === BlockType.IMAGE_BODY ||
        blockType === BlockType.TABLE_BODY ||
        blockType === BlockType.CODE_BODY
      ) {
        const result = getDataFromSpans(block.lines || []);
        if (result[0] || result[1]) {
          return result;
        }
      }
    }
    return ['', ''];
  }

  return getDataFromSpans(paraBlock.lines || []);
}

function mergeParaWithTextV2(paraBlock: any): any[] {
  let blockText = '';
  for (const line of paraBlock.lines || []) {
    for (const span of line.spans || []) {
      if (span.type === ContentType.TEXT) {
        span.content = fullToHalfExcludeMarks(span.content);
        blockText += span.content;
      }
    }
  }
  const blockLang = detectLang(blockText);

  const paraContent: any[] = [];
  const paraType = paraBlock.type;
  for (let i = 0; i < (paraBlock.lines || []).length; i += 1) {
    const line = paraBlock.lines[i];
    for (let j = 0; j < (line.spans || []).length; j += 1) {
      const span = line.spans[j];
      if (!span.content || !span.content.trim()) {
        continue;
      }
      let spanType = span.type;
      if (spanType === ContentType.TEXT) {
        if (paraType === BlockType.PHONETIC) {
          spanType = ContentTypeV2.SPAN_PHONETIC;
        } else {
          spanType = ContentTypeV2.SPAN_TEXT;
        }
      }
      if (spanType === ContentType.INLINE_EQUATION) {
        spanType = ContentTypeV2.SPAN_EQUATION_INLINE;
      }

      if (spanType === ContentTypeV2.SPAN_TEXT) {
        const cjkLangs = new Set(['zh', 'ja', 'ko']);
        const isLastSpan = j === line.spans.length - 1;
        let spanContent = '';

        if (cjkLangs.has(blockLang)) {
          spanContent = isLastSpan ? span.content : `${span.content} `;
        } else if (isLastSpan && isHyphenAtLineEnd(span.content)) {
          if (
            i + 1 < paraBlock.lines.length &&
            paraBlock.lines[i + 1].spans &&
            paraBlock.lines[i + 1].spans[0]?.type === ContentType.TEXT &&
            paraBlock.lines[i + 1].spans[0]?.content &&
            isLowerAlpha(paraBlock.lines[i + 1].spans[0].content[0])
          ) {
            spanContent = span.content.slice(0, -1);
          } else {
            spanContent = span.content;
          }
        } else {
          spanContent = `${span.content} `;
        }

        if (
          paraContent.length > 0 &&
          paraContent[paraContent.length - 1].type === spanType
        ) {
          paraContent[paraContent.length - 1].content += spanContent;
        } else {
          paraContent.push({ type: spanType, content: spanContent });
        }
      } else if (
        spanType === ContentTypeV2.SPAN_PHONETIC ||
        spanType === ContentTypeV2.SPAN_EQUATION_INLINE
      ) {
        paraContent.push({ type: spanType, content: span.content });
      }
    }
  }

  return paraContent;
}

function makeBlocksToContentListV2(
  paraBlock: any,
  imgBucketPath: string,
  pageSize: [number, number]
): any {
  const paraType = paraBlock.type;
  let paraContent: any = {};

  if (
    paraType === BlockType.HEADER ||
    paraType === BlockType.FOOTER ||
    paraType === BlockType.ASIDE_TEXT ||
    paraType === BlockType.PAGE_NUMBER ||
    paraType === BlockType.PAGE_FOOTNOTE
  ) {
    let contentType: string = ContentTypeV2.PAGE_HEADER;
    if (paraType === BlockType.HEADER) {
      contentType = ContentTypeV2.PAGE_HEADER;
    } else if (paraType === BlockType.FOOTER) {
      contentType = ContentTypeV2.PAGE_FOOTER;
    } else if (paraType === BlockType.ASIDE_TEXT) {
      contentType = ContentTypeV2.PAGE_ASIDE_TEXT;
    } else if (paraType === BlockType.PAGE_NUMBER) {
      contentType = ContentTypeV2.PAGE_NUMBER;
    } else if (paraType === BlockType.PAGE_FOOTNOTE) {
      contentType = ContentTypeV2.PAGE_FOOTNOTE;
    }
    paraContent = {
      type: contentType,
      content: {
        [`${contentType}_content`]: mergeParaWithTextV2(paraBlock),
      },
    };
  } else if (paraType === BlockType.TITLE) {
    const titleLevel = getTitleLevel(paraBlock);
    if (titleLevel !== 0) {
      paraContent = {
        type: ContentTypeV2.TITLE,
        content: {
          title_content: mergeParaWithTextV2(paraBlock),
          level: titleLevel,
        },
      };
    } else {
      paraContent = {
        type: ContentTypeV2.PARAGRAPH,
        content: {
          paragraph_content: mergeParaWithTextV2(paraBlock),
        },
      };
    }
  } else if (paraType === BlockType.TEXT || paraType === BlockType.PHONETIC) {
    paraContent = {
      type: ContentTypeV2.PARAGRAPH,
      content: {
        paragraph_content: mergeParaWithTextV2(paraBlock),
      },
    };
  } else if (paraType === BlockType.INTERLINE_EQUATION) {
    const [imagePath, mathContent] = getBodyData(paraBlock);
    paraContent = {
      type: ContentTypeV2.EQUATION_INTERLINE,
      content: {
        math_content: mathContent,
        math_type: 'latex',
        image_source: { path: `${imgBucketPath}/${imagePath}` },
      },
    };
  } else if (paraType === BlockType.IMAGE) {
    const imageCaption: any[] = [];
    const imageFootnote: any[] = [];
    const [imagePath] = getBodyData(paraBlock);
    const imageSource = { path: `${imgBucketPath}/${imagePath}` };
    for (const block of paraBlock.blocks || []) {
      if (block.type === BlockType.IMAGE_CAPTION) {
        imageCaption.push(...mergeParaWithTextV2(block));
      }
      if (block.type === BlockType.IMAGE_FOOTNOTE) {
        imageFootnote.push(...mergeParaWithTextV2(block));
      }
    }
    paraContent = {
      type: ContentTypeV2.IMAGE,
      content: {
        image_source: imageSource,
        image_caption: imageCaption,
        image_footnote: imageFootnote,
      },
    };
  } else if (paraType === BlockType.TABLE) {
    const tableCaption: any[] = [];
    const tableFootnote: any[] = [];
    const [imagePath, html] = getBodyData(paraBlock);
    const imageSource = { path: `${imgBucketPath}/${imagePath}` };
    const tableNestLevel = html.split('<table').length - 1 > 1 ? 2 : 1;
    const tableType =
      html.includes('colspan') || html.includes('rowspan') || tableNestLevel > 1
        ? ContentTypeV2.TABLE_COMPLEX
        : ContentTypeV2.TABLE_SIMPLE;

    for (const block of paraBlock.blocks || []) {
      if (block.type === BlockType.TABLE_CAPTION) {
        tableCaption.push(...mergeParaWithTextV2(block));
      }
      if (block.type === BlockType.TABLE_FOOTNOTE) {
        tableFootnote.push(...mergeParaWithTextV2(block));
      }
    }
    paraContent = {
      type: ContentTypeV2.TABLE,
      content: {
        image_source: imageSource,
        table_caption: tableCaption,
        table_footnote: tableFootnote,
        html,
        table_type: tableType,
        table_nest_level: tableNestLevel,
      },
    };
  } else if (paraType === BlockType.CODE) {
    const codeCaption: any[] = [];
    let codeContent: any[] = [];
    for (const block of paraBlock.blocks || []) {
      if (block.type === BlockType.CODE_CAPTION) {
        codeCaption.push(...mergeParaWithTextV2(block));
      }
      if (block.type === BlockType.CODE_BODY) {
        codeContent = mergeParaWithTextV2(block);
      }
    }
    const subType = paraBlock.sub_type;
    if (subType === BlockType.CODE) {
      paraContent = {
        type: ContentTypeV2.CODE,
        content: {
          code_caption: codeCaption,
          code_content: codeContent,
          code_language: paraBlock.guess_lang ?? 'txt',
        },
      };
    } else if (subType === BlockType.ALGORITHM) {
      paraContent = {
        type: ContentTypeV2.ALGORITHM,
        content: {
          algorithm_caption: codeCaption,
          algorithm_content: codeContent,
        },
      };
    }
  } else if (paraType === BlockType.REF_TEXT) {
    paraContent = {
      type: ContentTypeV2.LIST,
      content: {
        list_type: ContentTypeV2.LIST_REF,
        list_items: [
          {
            item_type: 'text',
            item_content: mergeParaWithTextV2(paraBlock),
          },
        ],
      },
    };
  } else if (paraType === BlockType.LIST) {
    let listType: string = ContentTypeV2.LIST_TEXT;
    if (paraBlock.sub_type === BlockType.REF_TEXT) {
      listType = ContentTypeV2.LIST_REF;
    } else if (paraBlock.sub_type === BlockType.TEXT) {
      listType = ContentTypeV2.LIST_TEXT;
    }
    const listItems: any[] = [];
    for (const block of paraBlock.blocks || []) {
      const itemContent = mergeParaWithTextV2(block);
      if (itemContent && itemContent.length > 0) {
        listItems.push({ item_type: 'text', item_content: itemContent });
      }
    }
    paraContent = {
      type: ContentTypeV2.LIST,
      content: {
        list_type: listType,
        list_items: listItems,
      },
    };
  }

  const [pageWidth, pageHeight] = pageSize;
  const paraBbox = paraBlock.bbox;
  if (paraBbox) {
    const [x0, y0, x1, y1] = paraBbox;
    paraContent.bbox = [
      Math.trunc((x0 * 1000) / pageWidth),
      Math.trunc((y0 * 1000) / pageHeight),
      Math.trunc((x1 * 1000) / pageWidth),
      Math.trunc((y1 * 1000) / pageHeight),
    ];
  }

  return paraContent;
}

export function unionMake(
  pdfInfoDict: any[],
  makeMode: string,
  imgBucketPath: string = ''
): any {
  const formulaEnableDefault =
    (process.env.MINERU_VLM_FORMULA_ENABLE ?? 'True').toLowerCase() === 'true';
  const tableEnableDefault =
    (process.env.MINERU_VLM_TABLE_ENABLE ?? 'True').toLowerCase() === 'true';
  const formulaEnable = getFormulaEnable(formulaEnableDefault);
  const tableEnable = getTableEnable(tableEnableDefault);

  const outputContent: any[] = [];
  for (const pageInfo of pdfInfoDict) {
    const parasOfLayout = pageInfo?.para_blocks;
    const parasOfDiscarded = pageInfo?.discarded_blocks;
    const pageIdx = pageInfo?.page_idx ?? 0;
    const pageSize = pageInfo?.page_size ?? [1, 1];
    if (makeMode === MakeMode.MM_MD || makeMode === MakeMode.NLP_MD) {
      if (!parasOfLayout) {
        continue;
      }
      const pageMarkdown = mkBlocksToMarkdown(
        parasOfLayout,
        makeMode,
        formulaEnable,
        tableEnable,
        imgBucketPath
      );
      outputContent.push(...pageMarkdown);
    } else if (makeMode === MakeMode.CONTENT_LIST) {
      const paraBlocks = [...(parasOfLayout || []), ...(parasOfDiscarded || [])];
      if (paraBlocks.length === 0) {
        continue;
      }
      for (const paraBlock of paraBlocks) {
        const paraContent = makeBlocksToContentList(
          paraBlock,
          imgBucketPath,
          pageIdx,
          pageSize
        );
        outputContent.push(paraContent);
      }
    } else if (makeMode === MakeMode.CONTENT_LIST_V2) {
      const paraBlocks = [...(parasOfLayout || []), ...(parasOfDiscarded || [])];
      const pageContents: any[] = [];
      if (paraBlocks.length) {
        for (const paraBlock of paraBlocks) {
          const paraContent = makeBlocksToContentListV2(
            paraBlock,
            imgBucketPath,
            pageSize
          );
          pageContents.push(paraContent);
        }
      }
      outputContent.push(pageContents);
    }
  }

  if (makeMode === MakeMode.MM_MD || makeMode === MakeMode.NLP_MD) {
    return outputContent.join('\n\n');
  }
  if (makeMode === MakeMode.CONTENT_LIST || makeMode === MakeMode.CONTENT_LIST_V2) {
    return outputContent;
  }
  return null;
}
