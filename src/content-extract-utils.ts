import type { ContentBlock } from './types';

/**
 * 按提取顺序回填内容，跳过无需识别的块
 */
export function applyExtractedContents(
  blocks: ContentBlock[],
  skipTypes: Set<string>,
  contents: string[]
): void {
  let contentIndex = 0;
  for (const block of blocks) {
    if (skipTypes.has(block.type)) {
      continue;
    }
    if (contentIndex >= contents.length) {
      break;
    }
    block.content = contents[contentIndex];
    contentIndex += 1;
  }
}
