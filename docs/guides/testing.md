# testing-guide

## ✅ 基本测试

```bash
MINERU_SERVER_URL=http://localhost:30000 npm test
```

默认使用环境变量指定的 PDF。

## 🔧 指定测试 PDF

```bash
MINERU_TEST_PDF=/path/to/your.pdf npm test
```

## 📊 性能 Benchmark

```bash
MINERU_SERVER_URL=http://localhost:30000 \
MINERU_TEST_PDF=/path/to/your.pdf \
MINERU_PAGE_LIMIT=3 \
MINERU_BENCHMARK_CONCURRENCY=1,2,4 \
npm run benchmark
```

若未指定 `MINERU_TEST_PDF`，脚本默认从
`/Users/weidwonder/Downloads/财会基础_kb` 选择 PDF；可用
`MINERU_BENCHMARK_SELECT=largest` 选择较大 PDF。

benchmark 输出包含：
- `read` / `render` / `encode`
- `layout` / `crop` / `content`
- `imageSave` / `postProcess`
- `middleJson` / `markdown`

## 🌱 常用环境变量

- `MINERU_SERVER_URL`：VLM 服务地址
- `MINERU_VL_MODEL_NAME`：模型名
- `MINERU_OUTPUT_DIR`：输出目录（默认 `./mineru-ts-output`）
- `MINERU_PAGE_CONCURRENCY`：页级并发，默认 2
- `MINERU_MAX_CONCURRENCY`：VLM 请求并发，默认 10
- `MINERU_PAGE_LIMIT`：仅解析前 N 页，用于快速测试
- `MINERU_USE_PAGE_CROP_CACHE`：是否启用页级裁剪缓存，默认 true

## ⚠️ 注意事项

- VLM 服务偶发空响应时，客户端会按空字符串处理，页面可能得到 0 blocks
- 内容裁剪默认使用 JPEG 0.75，保持 Markdown/middle_json 结构兼容并减少 VLM payload
- 如果出现 `canvas.node` 版本不匹配，请执行 `npm rebuild canvas` 或删除 `node_modules` 后重装
