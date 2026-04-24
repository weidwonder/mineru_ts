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
  pageConcurrency: 2,
  pageRetryLimit: 2,
  skipFailedPages: true,
});

await client.initialize();
const result = await client.parseFile('./document.pdf');
const markdown = client.resultToMarkdown(result);
```

如需快速验证前几页，可传入：

```ts
const result = await client.parseFile('./document.pdf', { pageLimit: 3 });
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
  pageConcurrency: 2,
  cropImageFormat: 'jpeg',
  cropImageQuality: 0.75,
  usePageCropCache: true,
  keepAlive: true,
  performanceLogging: true,
  pageRetryLimit: 2,
  skipFailedPages: true,
});
```

## 🌱 环境变量

测试入口和 benchmark 脚本支持：

```bash
MINERU_SERVER_URL=http://localhost:30000 \
MINERU_VL_MODEL_NAME=/path/to/model \
MINERU_PAGE_CONCURRENCY=2 \
MINERU_MAX_CONCURRENCY=10 \
MINERU_OUTPUT_DIR=./mineru-ts-output \
MINERU_PERFORMANCE_LOGGING=true \
MINERU_TEST_PDF=/path/to/document.pdf \
npm test
```
