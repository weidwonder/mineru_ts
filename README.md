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

## 📖 文档导航

- 入口说明：`CLAUDE.md`
- 快速上手：`docs/quickstart.md`
- 当前状态：`docs/status.md`
- 架构说明：`docs/architecture.md`
- 需求与差异：`docs/requirements.md`
- 测试指南：`docs/guides/testing.md`

## 📦 安装

```bash
npm install
```

## 🚀 快速开始

```ts
import { MinerUClient } from './src/mineru-client';

const client = new MinerUClient({
  serverUrl: 'http://localhost:30000',
  dpi: 200,
  layoutImageSize: [1036, 1036],
  maxConcurrency: 10,
});

await client.initialize();
const result = await client.parseFile('/path/to/document.pdf');
const markdown = client.resultToMarkdown(result);
```

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
}
```

## 🧪 测试

```bash
MINERU_TEST_PDF=/path/to/your.pdf npm test
```

## 📄 许可证

MIT License
