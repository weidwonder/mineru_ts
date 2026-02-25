# requirements

## 🎯 目标

- 在 TypeScript 中复刻 Python VLM 输出流程
- Markdown 正文尽量对齐（目标 ≥ 0.99，当前约 0.976）
- 图片体积尽量小，图片 hash 可不同

## ✅ 已满足

- python-vlm 链路完整移植（MagicModel / middle_json / mkcontent）
- 表格 OTSL → HTML 转换
- 公式后处理对齐
- 批量并发推理
- 空响应兼容处理（与 Python 行为对齐）
- 页级并发控制 + 页级重试 + 可选跳过失败页

## ⚠️ 已知差异/限制

- 1 处表格 colspan 差异（源自模型输出差异）
- OCR 细节可能有轻微差异（如字符推断、引号）
- VLM 服务偶发空响应（空 content 会按空字符串处理，默认不中断整文件）

## ❌ 非目标

- 像素级与 Python 渲染完全一致
- 保证所有 PDF 都 100% 与 Python 输出一致

## 🔗 依赖与前置条件

- VLM Server（OpenAI 兼容）
- Node.js + TypeScript
