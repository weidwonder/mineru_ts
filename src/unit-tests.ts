/**
 * 单元测试（TDD 用）
 */

import assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MinerUClient } from './mineru-client';
import { VLMClient } from './vlm-client';
import { postProcessBlock, postProcessBlocks, parseLayoutDetection } from './post-process';
import { ContentBlock, PageImage } from './types';
import { bytesMd5Upper, strSha256 } from './vlm-parity/hash-utils';
import { BlockType, ContentType, MakeMode } from './vlm-parity/enum';
import { isHyphenAtLineEnd, fullToHalfExcludeMarks, fullToHalf } from './vlm-parity/char-utils';
import { detectLang } from './vlm-parity/language';
import {
  isIn,
  bboxDistance,
  calculateOverlapAreaInBbox1AreaRatio,
} from './vlm-parity/boxbase';
import { reductOverlap, tieUpCategoryByIndex } from './vlm-parity/magic-model-utils';
import { convertOtslToHtml } from './vlm-parity/otsl2html';
import { processEquation } from './vlm-parity/equation-process';
import { MagicModel } from './vlm-parity/magic-model';
import { cutImage } from './vlm-parity/pdf-image-tools';
import { resultToMiddleJson } from './vlm-parity/model-output-to-middle-json';
import { mergeTable } from './vlm-parity/table-merge';
import { mergeParaWithText, mkBlocksToMarkdown, unionMake } from './vlm-parity/vlm-middle-json-mkcontent';
import { compareMarkdownStrings } from '../scripts/compare-md';
import { applyExtractedContents } from './content-extract-utils';

type LayoutBlock = {
  type: string;
  bbox: [number, number, number, number];
};

function buildLayoutOutput(blocks: LayoutBlock[]): string {
  return blocks
    .map(
      (block) =>
        `<|box_start|>${block.bbox[0]} ${block.bbox[1]} ${block.bbox[2]} ${block.bbox[3]}<|box_end|><|ref_start|>${block.type}<|ref_end|>`
    )
    .join('\n');
}

function crc32(buffer: Buffer): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }

  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const zlib = require('zlib') as typeof import('zlib');
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(6, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const bytesPerRow = width * 4;
  const raw = Buffer.alloc((bytesPerRow + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (bytesPerRow + 1);
    raw[rowStart] = 0;
    const sourceStart = y * bytesPerRow;
    raw.set(
      rgba.subarray(sourceStart, sourceStart + bytesPerRow),
      rowStart + 1
    );
  }

  const compressed = zlib.deflateSync(raw);
  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createQuadrantImage(size: number = 100): {
  buffer: Buffer;
  base64: string;
  width: number;
  height: number;
} {
  const half = Math.floor(size / 2);
  const rgba = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (x < half && y < half) {
        rgba[idx] = 255;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 255;
      } else if (x >= half && y >= half) {
        rgba[idx] = 255;
        rgba[idx + 1] = 255;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 255;
      } else {
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 255;
      }
    }
  }

  const buffer = encodePng(size, size, rgba);
  return {
    buffer,
    base64: `data:image/png;base64,${buffer.toString('base64')}`,
    width: size,
    height: size,
  };
}

function hashImageBase64(imageBase64: string): string {
  const crypto = require('crypto') as typeof import('crypto');
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  return crypto.createHash('sha256').update(base64Data).digest('hex');
}

async function testTwoStepExtractUsesCroppedImages(): Promise<void> {
  const { buffer, base64, width, height } = createQuadrantImage(100);
  const pageImage: PageImage = {
    pageIndex: 0,
    width,
    height,
    scale: 1,
    imageData: buffer,
    base64,
  };

  const layoutOutput = buildLayoutOutput([
    { type: 'text', bbox: [0, 0, 500, 500] },
    { type: 'text', bbox: [500, 500, 1000, 1000] },
  ]);

  const client = new MinerUClient({ serverUrl: 'http://example.com' } as any);
  (client as any).vlmClient = {
    predict: async () => layoutOutput,
    batchPredict: async (requests: Array<{ imageBase64: string }>) =>
      requests.map(
        (req) => `HASH:${hashImageBase64(req.imageBase64)}`
      ),
  };

  const blocks = await client.twoStepExtract(pageImage);
  const textBlocks = blocks.filter((block) => block.type === 'text');

  assert.strictEqual(textBlocks.length, 2, '应返回两个文本块');
  const hashes = textBlocks.map((block) =>
    (block.content || '').replace('HASH:', '')
  );
  assert.ok(hashes[0] && hashes[1], '文本内容应存在');
  assert.notStrictEqual(hashes[0], hashes[1], '应使用裁剪后的图像进行识别');
}

async function testImageBlockIsSaved(): Promise<void> {
  const outputDir = await fs.mkdtemp('/tmp/mineru-ts-test-');
  try {
    const { buffer, base64, width, height } = createQuadrantImage(100);
    const pageImage: PageImage = {
      pageIndex: 0,
      width,
      height,
      scale: 1,
      imageData: buffer,
      base64,
    };

    const layoutOutput = buildLayoutOutput([
      { type: 'image', bbox: [0, 0, 500, 500] },
    ]);

    const client = new MinerUClient({
      serverUrl: 'http://example.com',
      outputDir,
    } as any);

    (client as any).vlmClient = {
      predict: async () => layoutOutput,
      batchPredict: async () => [],
    };

    const blocks = await client.twoStepExtract(pageImage);
    const imageBlock = blocks.find((block) => block.type === 'image');

    assert.ok(imageBlock, '应保留图像块');
    assert.ok(imageBlock?.image_path, '图像块应有 image_path');

    const imagePath = path.join(outputDir, 'images', imageBlock!.image_path!);
    const stat = await fs.stat(imagePath);
    assert.ok(stat.isFile(), '图像文件应存在');
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
}

async function testCropImageResizesByNeed(): Promise<void> {
  const { buffer, base64 } = createQuadrantImage(10);
  const pageImage: PageImage = {
    pageIndex: 0,
    width: 10,
    height: 10,
    scale: 1,
    imageData: buffer,
    base64,
  };
  const client = new MinerUClient({ serverUrl: 'http://example.com' } as any);
  const croppedBase64 = await (client as any).cropImageFromBbox(
    pageImage.base64,
    [0, 0, 1000, 1000],
    pageImage.width,
    pageImage.height
  );
  const { loadImage } = await import('canvas');
  const img = await loadImage(Buffer.from(croppedBase64.split(',')[1], 'base64'));
  assert.ok(img.width >= 28 && img.height >= 28, '裁剪后尺寸应满足最小边要求');
}

function testTableParsingRemovesOtslTags(): void {
  const raw =
    '<fcel>Buyer<fcel>PHONEPE PVT. LTD.<lcel><lcel><nl>' +
    '<fcel>Supplier<fcel>Prozo<nl>';
  const block: ContentBlock = {
    type: 'table',
    bbox: [0, 0, 1000, 1000],
    content: raw,
  };

  const processed = postProcessBlock(block);
  assert.ok(processed.html, '表格应生成 HTML');
  assert.ok(!processed.html!.includes('<fcel>'), '不应包含 <fcel>');
  assert.ok(!processed.html!.includes('<lcel>'), '不应包含 <lcel>');
  assert.ok(!processed.html!.includes('<nl>'), '不应包含 <nl>');
  assert.ok(processed.html!.includes('<td>Buyer</td>'), '应包含 Buyer 单元格');
  assert.ok(processed.html!.includes('PHONEPE PVT. LTD.'), '应包含 PHONEPE 单元格');
}

function testTableParsingKeepsColspan(): void {
  const raw = '<fcel>Buyer<fcel>PHONEPE PVT. LTD.<lcel><lcel><nl>';
  const block: ContentBlock = {
    type: 'table',
    bbox: [0, 0, 1000, 1000],
    content: raw,
  };
  const processed = postProcessBlock(block);
  assert.ok(processed.html);
  assert.ok(processed.html!.includes('colspan="3"'));
}

function testSimplePostProcessConvertsTable(): void {
  const raw =
    '<fcel>Buyer<fcel>PHONEPE PVT. LTD.<lcel><lcel><nl>' +
    '<fcel>Supplier<fcel>Prozo<nl>';
  const blocks: ContentBlock[] = [
    {
      type: 'table',
      bbox: [0, 0, 1000, 1000],
      content: raw,
    },
  ];

  const processed = postProcessBlocks(blocks, { simplePostProcess: true });
  assert.strictEqual(processed.length, 1, '应保留表格块');
  assert.ok(processed[0].html, '简单后处理也应生成 HTML');
  assert.ok(
    !processed[0].html!.includes('<fcel>'),
    '简单后处理不应包含 <fcel>'
  );
}

function testSimplePostProcessKeepsEquationContent(): void {
  const original = '  \\\\left  ( x  )  ';
  const blocks: ContentBlock[] = [
    {
      type: 'equation',
      bbox: [0, 0, 1000, 1000],
      content: original,
    },
  ];

  const processed = postProcessBlocks(blocks, { simplePostProcess: true });
  assert.strictEqual(processed.length, 1, '应保留公式块');
  assert.strictEqual(
    processed[0].content,
    original,
    '简单后处理不应修改公式内容'
  );
}

function testHandleEquationBlockCombinesSpans(): void {
  const blocks: ContentBlock[] = [
    {
      type: 'equation_block',
      bbox: [0, 0, 1000, 1000],
      angle: 0,
      content: null,
    },
    {
      type: 'equation',
      bbox: [100, 100, 900, 400],
      angle: 0,
      content: 'a=1',
    },
    {
      type: 'equation',
      bbox: [100, 500, 900, 900],
      angle: 0,
      content: 'b=2',
    },
  ];

  const processed = postProcessBlocks(blocks, { handleEquationBlock: true });
  const equations = processed.filter((block) => block.type === 'equation');

  assert.strictEqual(equations.length, 1, '应合并为单个公式块');
  assert.ok(
    equations[0].content?.includes('\\begin{array}{l}'),
    '合并公式应使用 array 环境'
  );
  assert.ok(
    equations[0].content?.includes('a=1'),
    '合并公式应包含第一行'
  );
  assert.ok(
    equations[0].content?.includes('b=2'),
    '合并公式应包含第二行'
  );
}

function testEquationFix(): void {
  const raw = 'a \\coloneqq b';
  const fixed = processEquation(raw);
  assert.strictEqual(fixed, 'a := b');
}

function testMagicModelBasic(): void {
  const blocks = [
    { type: 'image', bbox: [0.1, 0.1, 0.2, 0.2], content: '', angle: 0 },
    { type: 'image_caption', bbox: [0.1, 0.21, 0.2, 0.25], content: 'cap', angle: 0 },
    { type: 'text', bbox: [0.3, 0.1, 0.4, 0.2], content: 'hi', angle: 0 },
  ];
  const mm = new MagicModel(blocks as any, 1000, 1000);
  assert.ok(mm.getImageBlocks().length >= 1);
}

function testMagicModelTableUsesHtml(): void {
  const blocks = [
    {
      type: 'table',
      bbox: [0.1, 0.1, 0.5, 0.5],
      content: '<fcel>A<fcel>B<nl>',
      html: '<table><tr><td>A</td><td>B</td></tr></table>',
      angle: 0,
    },
  ];
  const mm = new MagicModel(blocks as any, 1000, 1000);
  const tableBlocks = mm.getTableBlocks();
  assert.strictEqual(tableBlocks.length, 1);
  const body = tableBlocks[0].blocks.find((block: any) => block.type === 'table_body');
  assert.ok(body && body.lines && body.lines[0].spans && body.lines[0].spans[0]);
  const spanHtml = body.lines[0].spans[0].html;
  assert.strictEqual(spanHtml, '<table><tr><td>A</td><td>B</td></tr></table>');
}

function testCutImageNaming(): void {
  const pageImgMd5 = bytesMd5Upper(Buffer.from('page'));
  const imgPath = `image/${pageImgMd5}_0_1_2_3_4`;
  assert.strictEqual(strSha256(imgPath).length, 64);
  assert.ok(cutImage, 'cutImage 应可用');
}

function testMiddleJsonShape(): void {
  const middle = resultToMiddleJson([], [], { getSize: () => [100, 100] } as any, null);
  assert.ok(middle.pdf_info);
}

function testTableMergeNoCrash(): void {
  mergeTable([{ para_blocks: [] }, { para_blocks: [] }] as any);
}

function testMergeParaWithText(): void {
  const para = { type: 'text', lines: [{ spans: [{ type: 'text', content: 'Hello' }] }] };
  const out = mergeParaWithText(para as any, true, 'images');
  assert.ok(out.includes('Hello'));
}

function testMkBlocksToMarkdown(): void {
  const paraBlocks = [{ type: 'title', level: 1, lines: [{ spans: [{ type: 'text', content: 'T' }] }] }];
  const md = mkBlocksToMarkdown(paraBlocks as any, 'mm_markdown', true, true, 'images');
  assert.ok(md.join('\n').includes('# T'));
}

function testUnionMakeMarkdown(): void {
  const md = unionMake([], 'mm_markdown', 'images');
  assert.strictEqual(md, '');
}

function testResultToMarkdownPrefersPrecomputedMarkdown(): void {
  const client = new MinerUClient({ serverUrl: 'http://example.com' } as any);
  const result = {
    pages: [],
    metadata: { totalPages: 0, processingTime: 0 },
    markdown: 'READY',
  } as any;
  const md = client.resultToMarkdown(result);
  assert.strictEqual(md, 'READY');
}

function testCompareMarkdownSimilarity(): void {
  const same = compareMarkdownStrings('A\nB', 'A\nB');
  assert.ok(same.similarity > 0.999);
  const diff = compareMarkdownStrings('A\nB', 'A\nC');
  assert.ok(diff.similarity < 1);
}

function testHashUtils(): void {
  const data = Buffer.from('abc');
  assert.strictEqual(
    bytesMd5Upper(data),
    '900150983CD24FB0D6963F7D28E17F72'
  );
  assert.strictEqual(
    strSha256('x'),
    '2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881'
  );
}

function testEnums(): void {
  assert.strictEqual(BlockType.IMAGE, 'image');
  assert.strictEqual(ContentType.TABLE, 'table');
  assert.strictEqual(MakeMode.MM_MD, 'mm_markdown');
}

function testCharUtils(): void {
  assert.ok(isHyphenAtLineEnd('Test-'));
  assert.ok(!isHyphenAtLineEnd('Test'));
  assert.strictEqual(fullToHalfExcludeMarks('ＡＢＣ１２３'), 'ABC123');
  assert.strictEqual(fullToHalf('Ａ！１２３'), 'A!123');
}

function testDetectLang(): void {
  assert.strictEqual(detectLang('This is a test'), 'en');
  assert.strictEqual(detectLang('中文测试'), 'zh');
}

function testBoxbase(): void {
  assert.ok(isIn([1, 1, 2, 2], [0, 0, 3, 3]));
  assert.strictEqual(bboxDistance([0, 0, 1, 1], [2, 0, 3, 1]), 1);
  assert.strictEqual(
    calculateOverlapAreaInBbox1AreaRatio([0, 0, 2, 2], [1, 1, 3, 3]),
    0.25
  );
}

function testMagicModelUtils(): void {
  const bboxes = [
    { bbox: [0, 0, 4, 4] },
    { bbox: [1, 1, 2, 2] },
  ];
  const reduced = reductOverlap(bboxes as any);
  assert.strictEqual(reduced.length, 1);

  const ret = tieUpCategoryByIndex(
    () => [{ bbox: [0, 0, 1, 1], index: 5 }],
    () => [{ bbox: [0, 0, 1, 1], index: 6 }]
  );
  assert.strictEqual(ret.length, 1);
  assert.strictEqual(ret[0].obj_bboxes.length, 1);
}

function testOtslToHtml(): void {
  const raw = '<fcel>A<fcel>B<lcel><nl><fcel>C<fcel>D<lcel><nl>';
  const html = convertOtslToHtml(raw);
  assert.ok(html.startsWith('<table>'));
  assert.ok(html.includes('<td>A</td>'));
  assert.ok(html.includes('<td colspan="2">D</td>'));
}

function testParseLayoutDetectionAngle(): void {
  const raw = '<|box_start|>0 0 1000 1000<|box_end|><|ref_start|>text<|ref_end|><|rotate_right|>';
  const blocks = parseLayoutDetection(raw);
  assert.strictEqual(blocks.length, 1);
  assert.strictEqual(blocks[0].angle, 90);
  assert.deepStrictEqual(blocks[0].bbox, [0, 0, 1, 1]);
}

function testApplyExtractedContentsSkipsList(): void {
  const blocks: any[] = [
    { type: 'text', content: '' },
    { type: 'list', content: '' },
    { type: 'title', content: '' },
  ];
  const contents = ['文本一', '标题二'];
  applyExtractedContents(blocks as any, new Set(['image', 'list', 'equation_block']), contents);
  assert.strictEqual(blocks[0].content, '文本一');
  assert.strictEqual(blocks[1].content, '');
  assert.strictEqual(blocks[2].content, '标题二');
}

async function testPredictRetriesOnEmptyResponse(): Promise<void> {
  const client = new VLMClient({ serverUrl: 'http://example.com' });
  (client as any).modelName = 'mock-model';
  let calls = 0;
  const axiosInstance = (client as any).client;
  axiosInstance.post = async () => {
    calls += 1;
    if (calls === 1) {
      return { data: { choices: [{ message: { content: '' } }] } };
    }
    return { data: { choices: [{ message: { content: 'OK' } }] } };
  };

  const out = await client.predict('data:image/png;base64,AA==', '\nText Recognition:');
  assert.strictEqual(out, 'OK');
  assert.strictEqual(calls, 2);
}

async function run(): Promise<void> {
  const tests: Array<{ name: string; fn: () => Promise<void> | void }> = [
    { name: 'twoStepExtract 使用裁剪图像', fn: testTwoStepExtractUsesCroppedImages },
    { name: '图像块保存文件', fn: testImageBlockIsSaved },
    { name: '裁剪尺寸最小边', fn: testCropImageResizesByNeed },
    { name: '表格解析清理 OTSL 标签', fn: testTableParsingRemovesOtslTags },
    { name: '表格解析保留合并列', fn: testTableParsingKeepsColspan },
    { name: '简单后处理也转换表格', fn: testSimplePostProcessConvertsTable },
    { name: '简单后处理不修改公式', fn: testSimplePostProcessKeepsEquationContent },
    { name: '公式块合并', fn: testHandleEquationBlockCombinesSpans },
    { name: '公式修复', fn: testEquationFix },
    { name: 'MagicModel 基础', fn: testMagicModelBasic },
    { name: 'MagicModel 表格优先 HTML', fn: testMagicModelTableUsesHtml },
    { name: '裁剪命名', fn: testCutImageNaming },
    { name: 'middle_json 结构', fn: testMiddleJsonShape },
    { name: '跨页表格合并不崩溃', fn: testTableMergeNoCrash },
    { name: '段落合并文本', fn: testMergeParaWithText },
    { name: '块到 Markdown', fn: testMkBlocksToMarkdown },
    { name: 'unionMake 输出 Markdown', fn: testUnionMakeMarkdown },
    { name: '结果 Markdown 优先使用预计算', fn: testResultToMarkdownPrefersPrecomputedMarkdown },
    { name: 'Markdown 相似度比较', fn: testCompareMarkdownSimilarity },
    { name: 'hash 工具', fn: testHashUtils },
    { name: 'enum 常量', fn: testEnums },
    { name: '字符工具', fn: testCharUtils },
    { name: '语言检测', fn: testDetectLang },
    { name: 'bbox 工具', fn: testBoxbase },
    { name: 'magic model utils', fn: testMagicModelUtils },
    { name: 'OTSL 表格解析', fn: testOtslToHtml },
    { name: '布局解析角度', fn: testParseLayoutDetectionAngle },
    { name: '内容填充跳过 list', fn: testApplyExtractedContentsSkipsList },
    { name: '空响应重试', fn: testPredictRetriesOnEmptyResponse },
  ];

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`✓ ${test.name}`);
    } catch (error) {
      console.error(`✗ ${test.name}`);
      throw error;
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
