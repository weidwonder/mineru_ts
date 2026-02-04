# architecture

## 🧭 总览

MinerU TS 以 VLM 为核心，默认走 Python 兼容链路：

- **python-vlm**：复刻 Python 的 middle_json → Markdown 生成逻辑

## 🧱 关键模块

- `src/mineru-client.ts`：主入口，组织解析流程
- `src/vlm-client.ts`：OpenAI 兼容的 VLM HTTP 客户端
- `src/vlm-parity/*`：Python 兼容链路（MagicModel / middle_json / mkcontent）
- `src/post-process.ts`：表格、公式等后处理
- `src/vlm-parity/pdf-image-tools.ts`：PDFium 渲染与裁剪

## 🔄 数据流（python-vlm）

```
PDF
  → PDFium 渲染 (pageToImage)
  → Layout Detection
  → 按 block 裁剪图像 + 内容提取
  → MagicModel
  → middle_json
  → mkcontent/unionMake
  → Markdown
```

## 🧩 关键数据结构

- **ContentBlock**：单页块（bbox/type/content/html）
- **para_blocks**：MagicModel 归并后的段落结构
- **middle_json**：Python VLM 标准中间结构

## ⚠️ 已知差异

- VLM 模型偶发空响应，客户端已加重试
- 表格 colspan 可能有 1 处差异（模型输出差异导致）
