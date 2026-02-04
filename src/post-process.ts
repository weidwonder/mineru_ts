/**
 * 后处理模块
 * 处理 VLM 输出结果
 */

import { ContentBlock, BlockType, ParseError } from './types';
import { processEquation } from './vlm-parity/equation-process';
import { convertOtslToHtml } from './vlm-parity/otsl2html';

/**
 * 解析布局检测结果
 * 格式: <|box_start|>x0 y0 x1 y1<|box_end|><|ref_start|>type<|ref_end|>content
 */
export function parseLayoutDetection(rawOutput: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  try {
    const angleMapping: Record<string, 0 | 90 | 180 | 270> = {
      '<|rotate_up|>': 0,
      '<|rotate_right|>': 90,
      '<|rotate_down|>': 180,
      '<|rotate_left|>': 270,
    };

    const parseAngle = (tail: string): 0 | 90 | 180 | 270 | null => {
      for (const token of Object.keys(angleMapping)) {
        if (tail.includes(token)) {
          return angleMapping[token];
        }
      }
      return null;
    };

    const convertBbox = (
      coords: number[]
    ): [number, number, number, number] | null => {
      if (coords.some((coord) => coord < 0 || coord > 1000)) {
        return null;
      }
      let [x1, y1, x2, y2] = coords;
      if (x2 < x1) {
        [x1, x2] = [x2, x1];
      }
      if (y2 < y1) {
        [y1, y2] = [y2, y1];
      }
      if (x1 === x2 || y1 === y2) {
        return null;
      }
      return [x1 / 1000, y1 / 1000, x2 / 1000, y2 / 1000];
    };

    const linePattern =
      /^<\|box_start\|>([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)<\|box_end\|><\|ref_start\|>(\w+?)<\|ref_end\|>(.*)$/;

    for (const line of rawOutput.split('\n')) {
      if (!line.trim()) {
        continue;
      }
      const match = line.match(linePattern);
      if (!match) {
        continue;
      }
      const [, x0, y0, x1, y1, type, tail] = match;
      const coords = [x0, y0, x1, y1].map((value) =>
        Math.trunc(Number(value))
      );
      const bbox = convertBbox(coords);
      if (!bbox) {
        continue;
      }
      const angle = parseAngle(tail) ?? 0;
      blocks.push({
        type: type.toLowerCase() as BlockType,
        bbox,
        angle,
        content: null,
      });
    }

    return blocks;
  } catch (error: any) {
    throw new ParseError(
      `Failed to parse layout detection: ${error.message}`,
      error
    );
  }
}

/**
 * 过滤和清理块
 */
export function filterBlocks(
  blocks: ContentBlock[],
  options: {
    abandonList?: boolean;
    abandonParatext?: boolean;
    removeEmpty?: boolean;
  } = {}
): ContentBlock[] {
  return blocks.filter((block) => {
    // 移除空内容（图像块单独处理）
    if (options.removeEmpty) {
      const hasContent = Boolean(
        (typeof block.content === 'string' && block.content.trim()) ||
          block.html ||
          block.image_path
      );
      if (!hasContent && block.type !== 'image') {
        return false;
      }
    }

    // 移除列表块
    if (options.abandonList && block.type === 'list') {
      return false;
    }

    // 移除页眉页脚等
    if (
      options.abandonParatext &&
      ['header', 'footer', 'page_number'].includes(block.type)
    ) {
      return false;
    }

    // 移除已处理的 equation_block
    if (block.type === 'equation_block') {
      return false;
    }

    return true;
  });
}

/**
 * 转换表格为 HTML（简化版本）
 */
export function parseTableContent(rawContent: string): string {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('<table') && trimmed.endsWith('</table>')) {
    return trimmed;
  }

  const hasOtsl = /<(fcel|lcel|ecel|ucel|xcel|nl)>/.test(trimmed);
  if (!hasOtsl) {
    return '';
  }

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const rows = trimmed
    .replace(/\r/g, '')
    .split('<nl>')
    .map((row) => row.trim())
    .filter(Boolean);

  const htmlRows: string[] = [];

  for (const row of rows) {
    const cells = row
      .split('<fcel>')
      .map((cell) => cell.replace(/<(lcel|ecel|ucel|xcel)>/g, '').trim())
      .filter(Boolean);

    if (cells.length === 0) {
      continue;
    }

    const cellsHtml = cells
      .map((cell) => `<td>${escapeHtml(cell)}</td>`)
      .join('');
    htmlRows.push(`<tr>${cellsHtml}</tr>`);
  }

  if (htmlRows.length === 0) {
    return '';
  }

  return `<table>${htmlRows.join('')}</table>`;
}

export function convertTableToHTML(tableText: string): string {
  try {
    if (tableText.includes('<fcel>') || tableText.includes('<ecel>')) {
      return tableText
        .split('\n\n')
        .map((line) => {
          if (line.includes('<fcel>') || line.includes('<ecel>')) {
            return convertOtslToHtml(line);
          }
          return line;
        })
        .join('\n\n');
    }

    const parsed = parseTableContent(tableText);
    if (parsed) {
      return parsed;
    }

    const lines = tableText.trim().split('\n');
    let html = '<table>\n';

    for (const line of lines) {
      const cells = line.split('|').filter((c) => c.trim());
      html += '  <tr>\n';
      for (const cell of cells) {
        html += `    <td>${cell.trim()}</td>\n`;
      }
      html += '  </tr>\n';
    }

    html += '</table>';
    return html;
  } catch (error: any) {
    console.error('Failed to convert table to HTML:', error);
    return tableText; // 失败时返回原始文本
  }
}

/**
 * 处理公式（LaTeX 规范化）
 */
export function normalizeEquation(latex: string): string {
  try {
    let normalized = latex.trim();
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/\\left\s+/g, '\\left');
    normalized = normalized.replace(/\\right\s+/g, '\\right');
    return normalized;
  } catch (error: any) {
    console.error('Failed to normalize equation:', error);
    return latex;
  }
}

/**
 * 处理单个块的后处理
 */
export function postProcessBlock(block: ContentBlock): ContentBlock {
  const processed = { ...block };

  // 表格处理
  if (
    block.type === 'table' &&
    block.content &&
    !block.html
  ) {
    processed.html = convertTableToHTML(block.content);
  }

  // 公式处理
  if (block.type === 'equation' && block.content) {
    processed.content = processEquation(block.content);
  }

  return processed;
}

function addEquationBrackets(content: string): string {
  let out = content.trim();
  if (!out.startsWith('\\[')) {
    out = `\\\\[\\n${out}`;
  }
  if (!out.endsWith('\\]')) {
    out = `${out}\\n\\\\]`;
  }
  return out;
}

function bboxCoverRatio(
  boxA: [number, number, number, number],
  boxB: [number, number, number, number]
): number {
  const xA = Math.max(boxA[0], boxB[0]);
  const yA = Math.max(boxA[1], boxB[1]);
  const xB = Math.min(boxA[2], boxB[2]);
  const yB = Math.min(boxA[3], boxB[3]);
  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const areaB = Math.max(0, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]));
  if (areaB === 0) {
    return 0;
  }
  return interArea / areaB;
}

function combineEquations(equationContents: string[]): string {
  const tagPattern = /\\tag\s*\{[^}]*\}/g;
  let totalTags = 0;
  for (const content of equationContents) {
    totalTags += (content.match(tagPattern) || []).length;
  }

  let processedContents = equationContents;
  if (totalTags > 1) {
    processedContents = equationContents.map((content) =>
      content.replace(/\\tag\s*\{([^}]*)\}/g, '($1)')
    );
  }

  const lines = processedContents.map((content) => `${content} \\\\ `).join('');
  return `\\begin{array}{l} ${lines}\\end{array}`;
}

function handleEquationBlock(blocks: ContentBlock[]): ContentBlock[] {
  const semEquationIndices: number[] = [];
  const spanEquationIndices: number[] = [];

  blocks.forEach((block, idx) => {
    if (block.type === 'equation_block') {
      semEquationIndices.push(idx);
    } else if (block.type === 'equation') {
      spanEquationIndices.push(idx);
    }
  });

  const semEquationSpans = new Map<number, number[]>();
  for (const semIdx of semEquationIndices) {
    const covered = spanEquationIndices.filter(
      (spanIdx) =>
        bboxCoverRatio(
          blocks[semIdx].bbox,
          blocks[spanIdx].bbox
        ) > 0.9
    );
    if (covered.length > 1) {
      semEquationSpans.set(semIdx, covered);
    }
  }

  const outBlocks: ContentBlock[] = [];
  for (let idx = 0; idx < blocks.length; idx += 1) {
    const block = blocks[idx];
    const isSpan = Array.from(semEquationSpans.values()).some((spans) =>
      spans.includes(idx)
    );
    if (isSpan) {
      continue;
    }
    if (semEquationSpans.has(idx)) {
      const spanIndices = semEquationSpans.get(idx) || [];
      const spanContents = spanIndices
        .map((spanIdx) => blocks[spanIdx].content)
        .filter((content): content is string => Boolean(content));

      if (spanContents.length > 0) {
        outBlocks.push({
          type: 'equation',
          bbox: block.bbox,
          angle: block.angle,
          content: combineEquations(spanContents),
        });
      }
      continue;
    }
    if (block.type === 'equation_block') {
      continue;
    }
    outBlocks.push(block);
  }

  return outBlocks;
}

/**
 * 批量后处理
 */
export function postProcessBlocks(
  blocks: ContentBlock[],
  options: {
    simplePostProcess?: boolean;
    handleEquationBlock?: boolean;
    abandonList?: boolean;
    abandonParatext?: boolean;
  } = {}
): ContentBlock[] {
  const applyTableHtml = (block: ContentBlock): ContentBlock => {
    if (block.type === 'table' && block.content && !block.html) {
      return { ...block, html: convertTableToHTML(block.content) };
    }
    return { ...block };
  };

  let processed = blocks.map((block) => applyTableHtml(block));

  if (options.simplePostProcess) {
    return processed;
  }

  processed = processed.map((block) => {
    if (block.type === 'equation' && block.content) {
      return { ...block, content: processEquation(block.content) };
    }
    return { ...block };
  });

  if (options.handleEquationBlock) {
    processed = handleEquationBlock(processed);
  }

  processed = processed.map((block) => {
    if (block.type === 'equation' && block.content) {
      return { ...block, content: addEquationBrackets(block.content) };
    }
    return block;
  });

  processed = filterBlocks(processed, {
    abandonList: options.abandonList,
    abandonParatext: options.abandonParatext,
    removeEmpty: true,
  });

  return processed;
}
