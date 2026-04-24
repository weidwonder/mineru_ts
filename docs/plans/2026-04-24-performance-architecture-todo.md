# performance architecture todo

## 背景

本轮已完成低风险性能优化与裁剪链路优化：页级并发默认值、HTTP keep-alive、页级 RGB 裁剪缓存、JPEG payload、阶段耗时统计和 benchmark 脚本。

## 已验证瓶颈

- 旧裁剪链路在每个 block 上对整页 base64 调用 `loadImage`，同页多 block 会重复解码整页图。
- 当前优化路径直接复用 PDFium 渲染得到的页级 RGB buffer，只裁剪目标区域后再编码。

## 阶段三后续项

- 将 PDF 渲染从“一次性渲染所选页”改为“渲染 → 解析 → 释放”的流式页处理，降低大 PDF 峰值内存。
- 评估 PDFium 多 worker 渲染可行性；需要确认 `@hyzyla/pdfium` 文档对象与 WASM module 在线程间的安全边界。
- 引入全局 VLM 请求队列，确保多页并发时 `maxConcurrency` 是进程级上限，而不是每页 batch 局部上限。
- 为 benchmark 增加输出一致性校验：Markdown 正文相似度、middle_json 结构字段校验、图片引用数量校验。

## 风险说明

PDF 渲染并发和流式处理会改变资源生命周期，容易影响 `resultToMiddleJson` 依赖的 PDF page size 与图片裁剪输出。本轮未做大改，以保证输出一致性和可回滚。
