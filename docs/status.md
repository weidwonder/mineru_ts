# status

## ✅ 已完成

- Python VLM 兼容链路（middle_json → Markdown）
- 表格 OTSL → HTML 转换
- 公式后处理对齐
- 图像裁剪与尺寸控制
- 空响应重试（缓解 VLM 偶发空返回）
- 页级并发控制与页级重试
- 单页可重试错误自动跳过（默认开启）

## 📌 输出对齐现状

- Markdown 正文相似度约 **0.976**（不含图片引用）
- 主要差异：
  - 少量 OCR 推断差异（字符/标点）
  - **1 处表格 colspan 差异**（模型输出差异导致）

## ⚠️ 已知问题

- VLM 服务仍可能偶发 `Empty response`，默认会记录 warning 并跳过失败页

## 🔧 入口文件

- 解析与输出：`src/mineru-client.ts`
- VLM 客户端：`src/vlm-client.ts`
- Python 兼容链路：`src/vlm-parity/*`
- 测试脚本：`src/test.ts`
