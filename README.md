# MinerU TypeScript (VLM 模式)

本项目是对 MinerU Python 客户端 **VLM 模式** 的 TypeScript 复刻。  
目标：在不依赖 Python 的情况下，尽量复现 Python VLM 的 Markdown 输出结构与格式。

> 目前仅支持 VLM 模式，**其他模式暂不支持**。

## ✨ 特性

- 纯 TypeScript 实现
- VLM 驱动的布局检测与内容提取
- Python VLM 输出链路复刻（middle_json → Markdown）
- 表格 OTSL → HTML 转换
- 并发批量推理与重试机制
- 页级并发控制与页级重试
- 单页可重试错误可自动跳过（避免整文件失败）

## 📖 文档导航

- 入口说明：`CLAUDE.md`
- 快速上手：`docs/quickstart.md`
- 当前状态：`docs/status.md`
- 架构说明：`docs/architecture.md`
- 需求与差异：`docs/requirements.md`
- 测试指南：`docs/guides/testing.md`

## 📦 安装

### 从 npm 安装（推荐）

```bash
# 使用 npm
npm install mineru-ts

# 使用 pnpm
pnpm add mineru-ts

# 使用 yarn
yarn add mineru-ts
```

### 从源码安装（开发）

```bash
git clone https://github.com/weidwonder/mineru_ts.git
cd mineru_ts
npm install
npm run build
```

## 🚀 快速开始

```ts
import { MinerUClient } from 'mineru-ts';

const client = new MinerUClient({
  serverUrl: 'http://localhost:30000',
  dpi: 200,
  layoutImageSize: [1036, 1036],
  maxConcurrency: 10,
  outputDir: './output',  // 可选：指定输出目录保存提取的图像
});

await client.initialize();
const result = await client.parseFile('/path/to/document.pdf');

// 生成 Markdown 输出
const markdown = client.resultToMarkdown(result);

// 或获取结构化内容列表
const contentList = client.resultToContentList(result);
```

### 解析结果说明

`parseFile()` 返回的 `ParseResult` 对象包含：

```ts
interface ParseResult {
  pages: Array<{              // 每页的内容块
    pageIndex: number;
    blocks: ContentBlock[];   // 文本、标题、表格、图像、公式等块
  }>;
  markdown?: string;          // 可选：生成的 Markdown 文本
  middleJson?: any;           // 可选：中间 JSON 结构（Python VLM 兼容格式）
  metadata: {
    totalPages: number;       // PDF 总页数
    processingTime: number;   // 处理耗时（毫秒）
  };
}
```

### 输出说明

**Markdown 输出**:
- `resultToMarkdown(result)` 将解析结果转为 Markdown 格式
- 图像引用格式：`![](images/hash.png)`
- 表格转为 HTML 嵌入

**结构化内容**:
- `resultToContentList(result)` 返回内容列表（Python VLM 兼容格式）
- 包含文本、标题、表格、图像等元素的结构化数组

**图像文件**:
- 如果设置了 `outputDir`，提取的图像将保存到 `{outputDir}/images/` 目录
- 图像文件名为内容的 SHA-256 哈希值（如 `abc123...def.png`）
- 未设置 `outputDir` 时不会保存图像文件

## 🔧 关键配置

```ts
interface MinerUClientConfig {
  serverUrl: string;
  dpi?: number;
  layoutImageSize?: [number, number];
  minImageEdge?: number;
  maxImageEdgeRatio?: number;
  maxConcurrency?: number;
  maxRetries?: number;
  pageConcurrency?: number;
  pageRetryLimit?: number;
  skipFailedPages?: boolean;
}
```

## 🧪 测试

```bash
MINERU_TEST_PDF=/path/to/your.pdf npm test
```

## 📄 许可证

MIT License
