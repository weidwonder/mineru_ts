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

- VLM 服务偶发空响应，客户端已重试，但仍可能打印错误日志
- 输出目录可通过 `MINERU_OUTPUT_DIR` 指定（默认 `./mineru-ts-output`）
