# CLAUDE.md

> MinerU 的 TypeScript 客户端，实现 VLM 驱动的 PDF 结构化解析，并尽量对齐 Python VLM 输出。

注意：该实现并非官方实现。官方实现请参考 [mineru-vl-utils](https://github.com/opendatalab/mineru-vl-utils)。

## 📖 文档导航系统

### 阅读决策树

**首次进入项目**
1. 阅读本文件（CLAUDE.md）
2. 快速上手 → `docs/quickstart.md`
3. 了解现状 → `docs/status.md`

**理解系统设计**
- 架构与数据流 → `docs/architecture.md`
- 需求与目标 → `docs/requirements.md`

**日常开发/调试**
- 测试与运行 → `docs/guides/testing.md`
- 变更记录 → `docs/changelog.md`
- 历史计划（已完成）→ `docs/plans/`

## 📚 项目概述

- 纯 TypeScript 实现，默认走 `python-vlm` 兼容链路
- 解析流程：布局检测 → 内容提取 → post-process → middle_json → Markdown
- VLM 输出尽量与 Python 版本一致（当前正文相似度约 0.976）
- 图像 hash 可不同，但 Markdown 正文尽量对齐

## 🗂️ 项目结构

```
mineru-ts/
├── src/                 # 核心实现
├── docs/                # 文档体系
├── scripts/             # 对比与辅助脚本
└── README.md            # 项目概览
```

## 🎯 核心概念

- **middle_json**: Python VLM 链路的中间结构
- **MagicModel**: 将 block 聚合为段落/表格/图像等 para_blocks
- **OTSL**: 表格标记语言，转换为 HTML
- **VLM Server**: OpenAI 兼容接口（地址由环境变量或配置提供）

## 🔧 核心 API（常用）

```ts
new MinerUClient(config)
await client.initialize()
await client.parseFile(pdfPath)
client.resultToMarkdown(result)
client.resultToContentList(result)
```

## 📝 更多信息

- 架构细节 → `docs/architecture.md`
- 需求与差异 → `docs/requirements.md`
- 测试说明 → `docs/guides/testing.md`
