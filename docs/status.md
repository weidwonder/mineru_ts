# status

## ✅ 已完成

- Python VLM 兼容链路（middle_json → Markdown）
- 表格 OTSL → HTML 转换
- 公式后处理对齐
- 图像裁剪与尺寸控制
- 空响应兼容处理（与 Python 行为对齐：空 content 按空字符串处理）
- 页级并发控制与页级重试
- 单页可重试错误自动跳过（默认开启）

## 📌 输出对齐现状

- Markdown 正文相似度约 **0.976**（不含图片引用）
- 主要差异：
  - 少量 OCR 推断差异（字符/标点）
  - **1 处表格 colspan 差异**（模型输出差异导致）

## ⚠️ 已知问题

- VLM 服务偶发空响应时，页面可能解析为 0 blocks（不会中断整文件）

## 🔧 入口文件

- 解析与输出：`src/mineru-client.ts`
- VLM 客户端：`src/vlm-client.ts`
- Python 兼容链路：`src/vlm-parity/*`
- 测试脚本：`src/test.ts`
