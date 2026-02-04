/**
 * 测试脚本
 * 使用你提供的参数测试 MinerU 客户端
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MinerUClient } from './mineru-client';

async function main() {
  // 测试配置
  const serverUrl = process.env.MINERU_SERVER_URL || 'http://localhost:30000';
  const outputDir = process.env.MINERU_OUTPUT_DIR || path.resolve('mineru-ts-output');

  console.log('=== MinerU TypeScript Client Test ===\n');
  console.log(`Server URL: ${serverUrl}`);
  const pdfPath = process.env.MINERU_TEST_PDF;
  if (!pdfPath) {
    throw new Error('请设置 MINERU_TEST_PDF 环境变量指向待解析的 PDF 文件');
  }

  console.log(`PDF Path: ${pdfPath}`);
  console.log(`Output Dir: ${outputDir}\n`);

  try {
    // 创建客户端
    console.log('1. Initializing MinerU client...');
    const client = new MinerUClient({
      serverUrl,
      dpi: 200,
      layoutImageSize: [1036, 1036],
      outputDir,
      maxConcurrency: 10,
      timeout: 600000,
    });

    await client.initialize();
    console.log('   ✓ Client initialized\n');

    // 解析 PDF
    console.log('2. Parsing PDF...');
    const result = await client.parseFile(pdfPath);
    console.log(`   ✓ Parsed ${result.metadata.totalPages} pages`);
    console.log(
      `   ✓ Processing time: ${result.metadata.processingTime}ms\n`
    );

    // 创建输出目录
    await fs.mkdir(outputDir, { recursive: true });

    // 保存结果为 Markdown
    console.log('3. Saving results...');
    const markdown = client.resultToMarkdown(result);
    const markdownPath = path.join(outputDir, 'output.md');
    await fs.writeFile(markdownPath, markdown, 'utf-8');
    console.log(`   ✓ Markdown saved to: ${markdownPath}`);

    // 保存内容列表（JSON）
    const contentList = client.resultToContentList(result);
    const jsonPath = path.join(outputDir, 'content_list.json');
    await fs.writeFile(jsonPath, JSON.stringify(contentList, null, 2), 'utf-8');
    console.log(`   ✓ Content list saved to: ${jsonPath}`);

    // 保存完整结果
    const fullResultPath = path.join(outputDir, 'full_result.json');
    await fs.writeFile(
      fullResultPath,
      JSON.stringify(result, null, 2),
      'utf-8'
    );
    console.log(`   ✓ Full result saved to: ${fullResultPath}\n`);

    // 显示统计信息
    console.log('=== Statistics ===');
    let totalBlocks = 0;
    const blockTypeCounts: Record<string, number> = {};

    for (const page of result.pages) {
      totalBlocks += page.blocks.length;
      for (const block of page.blocks) {
        blockTypeCounts[block.type] = (blockTypeCounts[block.type] || 0) + 1;
      }
    }

    console.log(`Total pages: ${result.metadata.totalPages}`);
    console.log(`Total blocks: ${totalBlocks}`);
    console.log(`Processing time: ${result.metadata.processingTime}ms`);
    console.log(`\nBlock type distribution:`);
    for (const [type, count] of Object.entries(blockTypeCounts).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${type}: ${count}`);
    }

    console.log('\n=== Test Completed Successfully ===');
  } catch (error: any) {
    console.error('\n❌ Error occurred:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行测试
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
