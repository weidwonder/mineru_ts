# VLM Markdown Parity Implementation Plan

> **执行状态（2026-02-04）**：已完成，剩余 1 处表格 colspan 差异（模型输出差异导致）。正文相似度约 0.976（不含图片引用）。

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 TypeScript 中完整复刻 Python VLM 模式的 Markdown 输出（内容一致），图片体积尽量小。

**Architecture:** 新增一条“Python 兼容链路”：VLM 输出 → post_process → MagicModel → middle_json → mkcontent → Markdown。逐步移植 Python 的 `model_output_to_middle_json`、`vlm_middle_json_mkcontent`、`magic_model`、`otsl2html`、`equation_*` 等核心逻辑，并替换现有 `blocksToMarkdown` 输出路径。

**Tech Stack:** TypeScript、Node.js、canvas、pdfium 绑定、cheerio（HTML 解析）、ts-node。

> 备注：当前仓库不是 git 仓库，计划中的 commit 步骤在无 git 时跳过；若后续初始化 git，可按计划提交。

---

### Task 1: 新增 Python 兼容模块骨架 + Hash 工具

**Files:**
- Create: `src/vlm-parity/hash-utils.ts`
- Create: `src/vlm-parity/enum.ts`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（hash 与 enum）**

在 `src/unit-tests.ts` 追加：
```ts
import { bytesMd5Upper, strSha256 } from './vlm-parity/hash-utils';
import { BlockType, ContentType, MakeMode } from './vlm-parity/enum';

function testHashUtils(): void {
  const data = Buffer.from('abc');
  assert.strictEqual(bytesMd5Upper(data), '900150983CD24FB0D6963F7D28E17F72');
  assert.strictEqual(strSha256('x'), '2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881');
}

function testEnums(): void {
  assert.strictEqual(BlockType.IMAGE, 'image');
  assert.strictEqual(ContentType.TABLE, 'table');
  assert.strictEqual(MakeMode.MM_MD, 'mm_markdown');
}
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

Expected: `Cannot find module './vlm-parity/hash-utils'` 或断言失败。

**Step 3: 写最小实现**

创建 `src/vlm-parity/hash-utils.ts`：
```ts
import crypto from 'crypto';

export function bytesMd5Upper(data: Buffer): string {
  return crypto.createHash('md5').update(data).digest('hex').toUpperCase();
}

export function strMd5(input: string): string {
  return crypto.createHash('md5').update(Buffer.from(input, 'utf-8')).digest('hex');
}

export function strSha256(input: string): string {
  return crypto.createHash('sha256').update(Buffer.from(input, 'utf-8')).digest('hex');
}
```

创建 `src/vlm-parity/enum.ts`：
```ts
export const BlockType = {
  IMAGE: 'image',
  TABLE: 'table',
  IMAGE_BODY: 'image_body',
  TABLE_BODY: 'table_body',
  IMAGE_CAPTION: 'image_caption',
  TABLE_CAPTION: 'table_caption',
  IMAGE_FOOTNOTE: 'image_footnote',
  TABLE_FOOTNOTE: 'table_footnote',
  TEXT: 'text',
  TITLE: 'title',
  INTERLINE_EQUATION: 'interline_equation',
  LIST: 'list',
  INDEX: 'index',
  DISCARDED: 'discarded',
  CODE: 'code',
  CODE_BODY: 'code_body',
  CODE_CAPTION: 'code_caption',
  ALGORITHM: 'algorithm',
  REF_TEXT: 'ref_text',
  PHONETIC: 'phonetic',
  HEADER: 'header',
  FOOTER: 'footer',
  PAGE_NUMBER: 'page_number',
  ASIDE_TEXT: 'aside_text',
  PAGE_FOOTNOTE: 'page_footnote',
} as const;

export const ContentType = {
  IMAGE: 'image',
  TABLE: 'table',
  TEXT: 'text',
  INTERLINE_EQUATION: 'interline_equation',
  INLINE_EQUATION: 'inline_equation',
  EQUATION: 'equation',
  CODE: 'code',
} as const;

export const MakeMode = {
  MM_MD: 'mm_markdown',
  NLP_MD: 'nlp_markdown',
  CONTENT_LIST: 'content_list',
  CONTENT_LIST_V2: 'content_list_v2',
} as const;
```

**Step 4: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

Expected: 新增测试通过。

**Step 5: Commit**

```bash
git add src/vlm-parity/hash-utils.ts src/vlm-parity/enum.ts src/unit-tests.ts
git commit -m "feat: add parity hash utils and enums"
```

---

### Task 2: 端到端空白渲染前的字符/语言工具

**Files:**
- Create: `src/vlm-parity/char-utils.ts`
- Create: `src/vlm-parity/language.ts`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（full_to_half 与连字符规则）**

追加测试：
```ts
import { isHyphenAtLineEnd, fullToHalfExcludeMarks } from './vlm-parity/char-utils';
import { detectLang } from './vlm-parity/language';

function testCharUtils(): void {
  assert.ok(isHyphenAtLineEnd('Test-'));
  assert.ok(!isHyphenAtLineEnd('Test')); 
  assert.strictEqual(fullToHalfExcludeMarks('ＡＢＣ１２３'), 'ABC123');
}

function testDetectLang(): void {
  assert.strictEqual(detectLang('This is a test'), 'en');
  assert.strictEqual(detectLang('中文测试'), 'zh');
}
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

Expected: `Cannot find module './vlm-parity/char-utils'` 或断言失败。

**Step 3: 写最小实现**

`src/vlm-parity/char-utils.ts`：
```ts
export function isHyphenAtLineEnd(line: string): boolean {
  return /[A-Za-z]+-\s*$/.test(line);
}

export function fullToHalfExcludeMarks(text: string): string {
  const out: string[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if ((code >= 0xff21 && code <= 0xff3a) || (code >= 0xff41 && code <= 0xff5a) || (code >= 0xff10 && code <= 0xff19)) {
      out.push(String.fromCharCode(code - 0xfee0));
    } else {
      out.push(ch);
    }
  }
  return out.join('');
}
```

`src/vlm-parity/language.ts`：
```ts
export function detectLang(text: string): string {
  if (!text) return '';
  const cleaned = text.replace(/\n/g, '');
  // 简化版：包含 CJK 则返回 zh，否则 en
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(cleaned)) {
    return 'zh';
  }
  return 'en';
}
```

**Step 4: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

Expected: 新增测试通过。

**Step 5: Commit**

```bash
git add src/vlm-parity/char-utils.ts src/vlm-parity/language.ts src/unit-tests.ts
git commit -m "feat: add parity char and language utils"
```

---

### Task 3: Box 基础算法与 MagicModel 辅助函数

**Files:**
- Create: `src/vlm-parity/boxbase.ts`
- Create: `src/vlm-parity/magic-model-utils.ts`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（bbox 相关）**

追加测试：
```ts
import { isIn, bboxDistance, calculateOverlapAreaInBbox1AreaRatio } from './vlm-parity/boxbase';
import { reductOverlap, tieUpCategoryByIndex } from './vlm-parity/magic-model-utils';

function testBoxbase(): void {
  assert.ok(isIn([1,1,2,2], [0,0,3,3]));
  assert.strictEqual(bboxDistance([0,0,1,1], [2,0,3,1]), 1);
  assert.strictEqual(calculateOverlapAreaInBbox1AreaRatio([0,0,2,2],[1,1,3,3]), 0.25);
}

function testMagicModelUtils(): void {
  const bboxes = [
    { bbox: [0,0,4,4] },
    { bbox: [1,1,2,2] },
  ];
  const reduced = reductOverlap(bboxes as any);
  assert.strictEqual(reduced.length, 1);

  const ret = tieUpCategoryByIndex(
    () => [{ bbox: [0,0,1,1], index: 5 }],
    () => [{ bbox: [0,0,1,1], index: 6 }]
  );
  assert.strictEqual(ret.length, 1);
  assert.strictEqual(ret[0].obj_bboxes.length, 1);
}
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

Expected: `Cannot find module` 或断言失败。

**Step 3: 写最小实现**

`src/vlm-parity/boxbase.ts`：
```ts
export function isIn(box1: number[], box2: number[]): boolean {
  const [x0,y0,x1,y1] = box1; const [a0,b0,a1,b1] = box2;
  return x0 >= a0 && y0 >= b0 && x1 <= a1 && y1 <= b1;
}

export function bboxDistance(b1: number[], b2: number[]): number {
  const [x1,y1,x1b,y1b] = b1; const [x2,y2,x2b,y2b] = b2;
  const left = x2b < x1, right = x1b < x2, bottom = y2b < y1, top = y1b < y2;
  const dist = (p1: number[], p2: number[]) => Math.hypot(p1[0]-p2[0], p1[1]-p2[1]);
  if (top && left) return dist([x1,y1b],[x2b,y2]);
  if (left && bottom) return dist([x1,y1],[x2b,y2b]);
  if (bottom && right) return dist([x1b,y1],[x2,y2b]);
  if (right && top) return dist([x1b,y1b],[x2,y2]);
  if (left) return x1 - x2b;
  if (right) return x2 - x1b;
  if (bottom) return y1 - y2b;
  if (top) return y2 - y1b;
  return 0;
}

export function calculateOverlapAreaInBbox1AreaRatio(b1: number[], b2: number[]): number {
  const xLeft = Math.max(b1[0], b2[0]);
  const yTop = Math.max(b1[1], b2[1]);
  const xRight = Math.min(b1[2], b2[2]);
  const yBottom = Math.min(b1[3], b2[3]);
  if (xRight < xLeft || yBottom < yTop) return 0;
  const inter = (xRight - xLeft) * (yBottom - yTop);
  const area1 = (b1[2]-b1[0]) * (b1[3]-b1[1]);
  return area1 === 0 ? 0 : inter / area1;
}
```

`src/vlm-parity/magic-model-utils.ts`（仅实现 `reductOverlap` 与 `tieUpCategoryByIndex`，其余按需扩展）：
```ts
import { isIn, bboxDistance, bboxCenterDistance } from './boxbase';

export function reductOverlap<T extends { bbox: number[] }>(bboxes: T[]): T[] {
  const keep = bboxes.map(() => true);
  for (let i = 0; i < bboxes.length; i += 1) {
    for (let j = 0; j < bboxes.length; j += 1) {
      if (i === j) continue;
      if (isIn(bboxes[i].bbox, bboxes[j].bbox)) keep[i] = false;
    }
  }
  return bboxes.filter((_, idx) => keep[idx]);
}

export function tieUpCategoryByIndex(
  getSubjects: () => any[],
  getObjects: () => any[],
  extractSubject: (v: any) => any = (v) => v,
  extractObject: (v: any) => any = (v) => v
) {
  const subjects = getSubjects();
  const objects = getObjects();
  const result: any[] = [];
  subjects.forEach((sub, idx) => result.push({ sub_bbox: extractSubject(sub), obj_bboxes: [], sub_idx: idx }));

  for (const obj of objects) {
    if (subjects.length === 0) continue;
    const objIndex = obj.index;
    let minDiff = Infinity;
    let best: number[] = [];
    subjects.forEach((sub, idx) => {
      const diff = Math.abs(sub.index - objIndex);
      if (diff < minDiff) { minDiff = diff; best = [idx]; }
      else if (diff === minDiff) { best.push(idx); }
    });
    let target = best[0];
    if (best.length > 1) {
      let minDist = Infinity;
      for (const idx of best) {
        const d = bboxCenterDistance(subjects[idx].bbox, obj.bbox);
        if (d < minDist) { minDist = d; target = idx; }
      }
    }
    result[target].obj_bboxes.push(extractObject(obj));
  }
  return result;
}
```

**Step 4: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

**Step 5: Commit**

```bash
git add src/vlm-parity/boxbase.ts src/vlm-parity/magic-model-utils.ts src/unit-tests.ts
git commit -m "feat: add bbox and magic model utils"
```

---

### Task 4: OTSL 表格解析（otsl2html）

**Files:**
- Create: `src/vlm-parity/otsl2html.ts`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（OTSL）**

追加测试：
```ts
import { convertOtslToHtml } from './vlm-parity/otsl2html';

function testOtslToHtml(): void {
  const raw = '<fcel>A<fcel>B<lcel><nl><fcel>C<fcel>D<lcel><nl>';
  const html = convertOtslToHtml(raw);
  assert.ok(html.startsWith('<table>'));
  assert.ok(html.includes('<td>A</td>'));
  assert.ok(html.includes('<td>D</td>'));
}
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

**Step 3: 写最小实现（移植 Python 逻辑）**

`src/vlm-parity/otsl2html.ts`（按 Python `otsl2html.py` 翻译）：
```ts
export function convertOtslToHtml(otslContent: string): string {
  // TODO: 按 Python 逻辑完整移植：
  // 1) otsl_extract_tokens_and_text
  // 2) otsl_parse_texts
  // 3) TableData/grid
  // 4) export_to_html
  // 要求生成与 Python 一致的 rowspan/colspan
  return '';
}
```

**Step 4: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

**Step 5: Commit**

```bash
git add src/vlm-parity/otsl2html.ts src/unit-tests.ts
git commit -m "feat: port otsl2html"
```

---

### Task 5: 公式后处理（equation_*）与 post_process 对齐

**Files:**
- Create: `src/vlm-parity/equation-left-right.ts`
- Create: `src/vlm-parity/equation-double-subscript.ts`
- Create: `src/vlm-parity/equation-fix-eqqcolon.ts`
- Create: `src/vlm-parity/equation-big.ts`
- Create: `src/vlm-parity/equation-leq.ts`
- Create: `src/vlm-parity/equation-unbalanced-braces.ts`
- Modify: `src/post-process.ts`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（公式修复 + equation_block）**

追加测试：
```ts
import { processEquation } from './vlm-parity/equation-process';

function testEquationFix(): void {
  const raw = '\\left ( x \\right )';
  const fixed = processEquation(raw);
  assert.ok(fixed.includes('\\left('));
}
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

**Step 3: 写最小实现（移植 Python）**

新增 `src/vlm-parity/equation-process.ts`（封装调用）：
```ts
import { tryMatchEquationLeftRight } from './equation-left-right';
import { tryFixEquationDoubleSubscript } from './equation-double-subscript';
import { tryFixEquationEqqcolon } from './equation-fix-eqqcolon';
import { tryFixEquationBig } from './equation-big';
import { tryFixEquationLeq } from './equation-leq';
import { tryFixUnbalancedBraces } from './equation-unbalanced-braces';

export function processEquation(content: string): string {
  let out = content;
  out = tryMatchEquationLeftRight(out);
  out = tryFixEquationDoubleSubscript(out);
  out = tryFixEquationEqqcolon(out);
  out = tryFixEquationBig(out);
  out = tryFixEquationLeq(out);
  out = tryFixUnbalancedBraces(out);
  return out;
}
```

在 `src/post-process.ts` 中用 `processEquation` 替换现有公式处理，并保持 `equation_block` 合并逻辑与 Python 一致。

**Step 4: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

**Step 5: Commit**

```bash
git add src/vlm-parity/equation-*.ts src/vlm-parity/equation-process.ts src/post-process.ts src/unit-tests.ts
git commit -m "feat: port equation post-process"
```

---

### Task 6: MagicModel 迁移（VLM block → para_blocks）

**Files:**
- Create: `src/vlm-parity/magic-model.ts`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（image/table/code/list 归并）**

追加测试：
```ts
import { MagicModel } from './vlm-parity/magic-model';

function testMagicModelBasic(): void {
  const blocks = [
    { type: 'image', bbox: [0.1,0.1,0.2,0.2], content: '', angle: 0 },
    { type: 'image_caption', bbox: [0.1,0.21,0.2,0.25], content: 'cap', angle: 0 },
    { type: 'text', bbox: [0.3,0.1,0.4,0.2], content: 'hi', angle: 0 },
  ];
  const mm = new MagicModel(blocks as any, 1000, 1000);
  assert.ok(mm.getImageBlocks().length >= 1);
}
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

**Step 3: 写最小实现（移植 Python `vlm_magic_model.py`）**

`src/vlm-parity/magic-model.ts`：
```ts
// 关键点：
// 1) bbox 从归一化 * page_size 转为像素 bbox
// 2) 不同 block_type 映射到 span_type
// 3) code/algorithm 处理 inline equation
// 4) fix_two_layer_blocks / fix_list_blocks 逻辑完整移植
export class MagicModel { /* ...完整移植 Python 逻辑... */ }
```

**Step 4: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

**Step 5: Commit**

```bash
git add src/vlm-parity/magic-model.ts src/unit-tests.ts
git commit -m "feat: port MagicModel"
```

---

### Task 7: PDFium 渲染与裁剪（page_to_image / cut_image）

**Files:**
- Create: `src/vlm-parity/pdf-reader.ts`
- Create: `src/vlm-parity/pdf-image-tools.ts`
- Create: `src/vlm-parity/cut-image.ts`
- Modify: `package.json`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（md5 命名与裁剪路径）**

追加测试：
```ts
import { cutImage } from './vlm-parity/pdf-image-tools';
import { bytesMd5Upper, strSha256 } from './vlm-parity/hash-utils';

function testCutImageNaming(): void {
  const pageImgMd5 = bytesMd5Upper(Buffer.from('page'));
  const imgPath = `image/${pageImgMd5}_0_1_2_3_4`;
  assert.strictEqual(strSha256(imgPath).length, 64);
}
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

**Step 3: 安装 pdfium 依赖**

在 `package.json` 增加依赖（示例）：
```json
"dependencies": {
  "@hyzyla/pdfium": "^1.0.0",
  "cheerio": "^1.0.0"
}
```

**Step 4: 写最小实现（移植 `pdf_reader.py` + `pdf_image_tools.py`）**

`src/vlm-parity/pdf-reader.ts`：
```ts
// 1) pageToImage: dpi/72，maxWidthOrHeight=3500
// 2) 返回 { rgbBuffer, width, height, scale }
// 3) imageToBytes: JPEG（质量可设 70~80）
```

`src/vlm-parity/pdf-image-tools.ts`：
```ts
// loadImagesFromPdfBytes: 使用 pdfium 渲染为 RGB buffer
// getCropImg: bbox * scale
// cutImage: 生成 strSha256(path) + '.jpg'
```

**Step 5: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

**Step 6: Commit**

```bash
git add src/vlm-parity/pdf-*.ts src/vlm-parity/cut-image.ts package.json src/unit-tests.ts
git commit -m "feat: port pdfium rendering and cut image"
```

---

### Task 8: middle_json 生成（model_output_to_middle_json）

**Files:**
- Create: `src/vlm-parity/model-output-to-middle-json.ts`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（结构与排序）**

追加测试：
```ts
import { resultToMiddleJson } from './vlm-parity/model-output-to-middle-json';

function testMiddleJsonShape(): void {
  const middle = resultToMiddleJson([], [], { getSize: () => [100,100] } as any, null);
  assert.ok(middle.pdf_info);
}
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

**Step 3: 写最小实现（移植 `model_output_to_middle_json.py`）**

`src/vlm-parity/model-output-to-middle-json.ts`：
```ts
// blocksToPageInfo: MagicModel + cut_image_and_table
// resultToMiddleJson: 遍历 page，生成 pdf_info
// crossPageTableMerge: 调用 table_merge
```

**Step 4: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

**Step 5: Commit**

```bash
git add src/vlm-parity/model-output-to-middle-json.ts src/unit-tests.ts
git commit -m "feat: port model_output_to_middle_json"
```

---

### Task 9: 表格跨页合并（table_merge）

**Files:**
- Create: `src/vlm-parity/table-merge.ts`
- Modify: `src/vlm-parity/model-output-to-middle-json.ts`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（跨页合并）**

追加测试：
```ts
import { mergeTable } from './vlm-parity/table-merge';

function testTableMergeNoCrash(): void {
  mergeTable([{ para_blocks: [] }, { para_blocks: [] }]);
}
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

**Step 3: 写最小实现（移植 `table_merge.py`）**

`src/vlm-parity/table-merge.ts`：
```ts
// 使用 cheerio 解析 html，移植 detect_table_headers / check_rows_match / can_merge_tables / merge_table
```

**Step 4: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

**Step 5: Commit**

```bash
git add src/vlm-parity/table-merge.ts src/vlm-parity/model-output-to-middle-json.ts src/unit-tests.ts
git commit -m "feat: port table merge"
```

---

### Task 10: Markdown 生成（vlm_middle_json_mkcontent）

**Files:**
- Create: `src/vlm-parity/vlm-middle-json-mkcontent.ts`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（merge_para_with_text 与 mk_blocks_to_markdown）**

追加测试：
```ts
import { mergeParaWithText, mkBlocksToMarkdown } from './vlm-parity/vlm-middle-json-mkcontent';

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
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

**Step 3: 写最小实现（移植 Python）**

`src/vlm-parity/vlm-middle-json-mkcontent.ts`：
```ts
// 1) mergeParaWithText: 复刻 CJK/西文空格与连字符逻辑
// 2) mkBlocksToMarkdown: 复刻 block 类型输出顺序
// 3) unionMake: 输出 Markdown / content_list / content_list_v2
```

**Step 4: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

**Step 5: Commit**

```bash
git add src/vlm-parity/vlm-middle-json-mkcontent.ts src/unit-tests.ts
git commit -m "feat: port vlm middle json markdown"
```

---

### Task 11: MinerUClient 接入新链路

**Files:**
- Modify: `src/mineru-client.ts`
- Modify: `src/types.ts`
- Modify: `src/test.ts`
- Modify: `src/unit-tests.ts`

**Step 1: 写失败测试（新配置与 union_make 输出）**

追加测试：
```ts
import { unionMake } from './vlm-parity/vlm-middle-json-mkcontent';

function testUnionMakeMarkdown(): void {
  const md = unionMake([], 'mm_markdown', 'images');
  assert.strictEqual(md, '');
}
```

**Step 2: 运行测试确认失败**

Run: `npx ts-node src/unit-tests.ts`

**Step 3: 写最小实现**

在 `MinerUClient` 新增模式：
- `outputMode` 已移除（仅保留 python-vlm 链路）
- `parseFile()` 完成后，如果是 `python-vlm`：
  - 通过 `resultToMiddleJson` 生成 middle_json
  - 用 `unionMake` 生成 Markdown

**Step 4: 运行测试确认通过**

Run: `npx ts-node src/unit-tests.ts`

**Step 5: Commit**

```bash
git add src/mineru-client.ts src/types.ts src/test.ts src/unit-tests.ts
git commit -m "feat: wire python-vlm output pipeline"
```

---

### Task 12: 端到端对齐测试（与 Python 输出比对）

**Files:**
- Create: `scripts/compare-md.ts`
- Modify: `src/test.ts`

**Step 1: 写失败测试（diff 统计）**

`./scripts/compare-md.ts`：
```ts
import fs from 'fs';
import difflib from 'difflib';
// 读取 Python md 与 TS md，输出行级相似度
```

**Step 2: 运行对比**

Run:
```bash
npx ts-node src/test.ts   # 生成 TS md
node scripts/compare-md.ts <python_md> <ts_md>
```

Expected: 相似度接近 1.0；若低于 0.95，继续定位差异并回到对应任务修正。

**Step 3: Commit**

```bash
git add scripts/compare-md.ts src/test.ts
git commit -m "test: add markdown diff script"
```

---

### Task 13: 完整回归与输出确认

**Files:**
- None

**Step 1: 全量运行**

Run:
```bash
npx ts-node src/test.ts
node scripts/compare-md.ts /path/to/python-output.md \
  /path/to/ts-output.md
```

Expected: 行级相似度=1.0，差异为 0。

**Step 2: 输出验收**

检查：
- Markdown 行数完全一致
- 图片路径一致且图片体积更小

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: achieve python VLM markdown parity"
```

---

## 执行说明

完成计划后请选择执行方式：

**1. Subagent-Driven（本会话）** - 使用 superpowers:subagent-driven-development，任务逐个执行

**2. Parallel Session（新会话）** - 新会话中用 superpowers:executing-plans 执行

请选择 1 或 2。
