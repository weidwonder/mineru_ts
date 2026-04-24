# architecture

## 🧭 总览

MinerU TS 以 VLM 为核心，默认走 Python 兼容链路：

- **python-vlm**：复刻 Python 的 middle_json → Markdown 生成逻辑

## 🧱 关键模块

- `src/mineru-client.ts`：主入口，组织解析流程
- `src/vlm-client.ts`：OpenAI 兼容的 VLM HTTP 客户端
- `src/env-config.ts`：从环境变量生成测试/benchmark 配置
- `src/vlm-parity/*`：Python 兼容链路（MagicModel / middle_json / mkcontent）
- `src/post-process.ts`：表格、公式等后处理
- `src/vlm-parity/pdf-image-tools.ts`：PDFium 渲染与裁剪

## 🔄 数据流（python-vlm）

```
PDF
  → PDFium 渲染 (pageToImage)
  → Layout Detection
  → 复用页级 RGB buffer 按 block 裁剪图像 + 内容提取
  → MagicModel
  → middle_json
  → mkcontent/unionMake
  → Markdown
```

## ⚡ 性能路径

- VLM HTTP client 默认配置 HTTP/HTTPS keep-alive agent，减少连接建立开销。
- 页级并发默认 2，VLM 请求并发默认 10，避免单页串行但不盲目打满服务。
- 内容裁剪默认走页级 RGB buffer，不再为每个 block 反复 `loadImage` 解码整页图。
- 裁剪 payload 默认 JPEG 0.75，与 Python 裁剪输出更接近；可通过配置回退 PNG 或关闭缓存。
- `ParseResult.metadata.performance` 记录 render、layout、content、crop/save、middle_json、markdown 等阶段耗时。

## 🧩 关键数据结构

- **ContentBlock**：单页块（bbox/type/content/html）
- **para_blocks**：MagicModel 归并后的段落结构
- **middle_json**：Python VLM 标准中间结构

## ⚠️ 已知差异

- VLM 模型偶发空响应：与 Python 对齐，空 content 按空字符串处理；页面可能产出 0 blocks
- 表格 colspan 可能有 1 处差异（模型输出差异导致）
