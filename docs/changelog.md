# changelog

## 2026-04-24

- 性能优化
  - 默认 `pageConcurrency` 调整为 2，`maxConcurrency` 调整为 10
  - VLM HTTP client 默认启用 HTTP/HTTPS keep-alive agent
  - 新增页级 RGB 裁剪缓存，减少同页多 block 重复整页解码
  - 内容裁剪 payload 默认改为 JPEG 0.75，可配置回退
  - 新增环境变量配置入口与 `npm run benchmark`
  - `ParseResult.metadata.performance` 增加阶段耗时统计

## 2026-02-25

- v1.0.2
  - 与 Python 客户端对齐：VLM `content` 为空时返回空字符串，不再抛出 `Empty response` 异常
  - 修复布局阶段空响应导致的长时间指数退避重试问题，失败页可快速进入后续流程
- v1.0.1
- 新增页级并发控制（`pageConcurrency`，默认 1）
- 新增页级重试配置（`pageRetryLimit`，默认 2）
- 新增可选跳过失败页（`skipFailedPages`，默认 `true`）
- 修复超长 PDF 中单页空响应导致整文件失败的问题
- 补充页级容错相关单元测试与文档说明

## 2026-02-04

- 增加 python-vlm 兼容链路（middle_json → Markdown）
- 修复内容回填错位，恢复标题行
- 表格 OTSL 转 HTML 与 Python 对齐
- 空响应重试（缓解 VLM 偶发空返回）
- 测试脚本支持备用 PDF 路径
- 移除 legacy 代码与根目录调试脚本
