# quickstart

## 🎯 5 分钟上手

### 1. 安装依赖

```bash
cd mineru-ts
npm install
```

### 2. 运行测试

```bash
npm test
```

如需指定 PDF：

```bash
MINERU_TEST_PDF=/path/to/your.pdf npm test
```

## 📝 基本使用

```ts
import { MinerUClient } from './src/mineru-client';

const client = new MinerUClient({
  serverUrl: 'http://localhost:30000',
  dpi: 200,
  layoutImageSize: [1036, 1036],
  maxConcurrency: 10,
  pageConcurrency: 1,
  pageRetryLimit: 2,
  skipFailedPages: true,
});

await client.initialize();
const result = await client.parseFile('./document.pdf');
const markdown = client.resultToMarkdown(result);
```

## 🔧 常用配置

```ts
const client = new MinerUClient({
  serverUrl: 'http://your-vlm-server:30000',
  dpi: 200,
  layoutImageSize: [1036, 1036],
  maxConcurrency: 10,
  timeout: 600000,
  maxRetries: 3,
  pageConcurrency: 1,
  pageRetryLimit: 2,
  skipFailedPages: true,
});
```
