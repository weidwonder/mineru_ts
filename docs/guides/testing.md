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

## ⚠️ 注意事项

- VLM 服务偶发空响应时，客户端会做页级重试；重试耗尽后默认跳过该页并打印 warning
- 输出目录可通过 `MINERU_OUTPUT_DIR` 指定（默认 `./mineru-ts-output`）
- 如果出现 `canvas.node` 版本不匹配，请执行 `npm rebuild canvas` 或删除 `node_modules` 后重装
