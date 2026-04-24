import * as fs from 'fs/promises';
import * as path from 'path';
import { MinerUClient } from '../src/mineru-client';
import { loadMinerUConfigFromEnv, loadParseOptionsFromEnv } from '../src/env-config';

type PdfCandidate = {
  path: string;
  size: number;
};

function parseConcurrencyList(): number[] {
  const raw = process.env.MINERU_BENCHMARK_CONCURRENCY ?? '1,2,4';
  const values = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value >= 1)
    .map((value) => Math.floor(value));
  return values.length > 0 ? values : [1, 2, 4];
}

async function collectPdfCandidates(rootDir: string): Promise<PdfCandidate[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const candidates: PdfCandidate[] = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      candidates.push(...await collectPdfCandidates(entryPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      const stat = await fs.stat(entryPath);
      candidates.push({ path: entryPath, size: stat.size });
    }
  }

  return candidates;
}

async function choosePdf(): Promise<string> {
  const explicitPdf = process.env.MINERU_BENCHMARK_PDF ?? process.env.MINERU_TEST_PDF;
  if (explicitPdf) {
    return explicitPdf;
  }

  const sourceDir =
    process.env.MINERU_TEST_PDF_DIR ?? '/Users/weidwonder/Downloads/财会基础_kb';
  const candidates = await collectPdfCandidates(sourceDir);
  if (candidates.length === 0) {
    throw new Error(`未在目录中找到 PDF：${sourceDir}`);
  }

  const selectMode = process.env.MINERU_BENCHMARK_SELECT ?? 'smallest';
  candidates.sort((left, right) => {
    if (selectMode === 'largest') {
      return right.size - left.size;
    }
    return left.size - right.size;
  });

  return candidates[0].path;
}

async function main(): Promise<void> {
  const pdfPath = await choosePdf();
  const concurrencyList = parseConcurrencyList();
  const outputBase =
    process.env.MINERU_OUTPUT_DIR ??
    '/Users/weidwonder/Downloads/财会基础_kb_markdown_ts_perf';
  const parseOptions = loadParseOptionsFromEnv();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const results: any[] = [];

  console.log('=== MinerU TypeScript Benchmark ===');
  console.log(`PDF: ${pdfPath}`);
  console.log(`Output Base: ${outputBase}`);
  console.log(`Concurrency: ${concurrencyList.join(', ')}`);
  console.log(`Page Limit: ${parseOptions.pageLimit ?? '(all)'}`);

  for (const pageConcurrency of concurrencyList) {
    const outputDir = path.join(outputBase, `${timestamp}-pc${pageConcurrency}`);
    const config = loadMinerUConfigFromEnv({
      outputDir,
      pageConcurrency,
      performanceLogging: true,
    });

    console.log(`\n--- pageConcurrency=${pageConcurrency} ---`);
    const client = new MinerUClient(config);
    await client.initialize();

    const startTime = Date.now();
    const result = await client.parseFile(pdfPath, parseOptions);
    const elapsedMs = Date.now() - startTime;
    const markdown = client.resultToMarkdown(result);

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, 'output.md'), markdown, 'utf-8');
    await fs.writeFile(
      path.join(outputDir, 'benchmark-result.json'),
      JSON.stringify(
        {
          pdfPath,
          outputDir,
          pageConcurrency,
          elapsedMs,
          metadata: result.metadata,
        },
        null,
        2
      ),
      'utf-8'
    );

    results.push({
      pageConcurrency,
      elapsedMs,
      totalPages: result.metadata.totalPages,
      performance: result.metadata.performance,
      outputDir,
    });
    console.log(`完成：${elapsedMs}ms，输出：${outputDir}`);
  }

  const summaryPath = path.join(outputBase, `${timestamp}-summary.json`);
  await fs.mkdir(outputBase, { recursive: true });
  await fs.writeFile(
    summaryPath,
    JSON.stringify({ pdfPath, parseOptions, results }, null, 2),
    'utf-8'
  );

  console.log('\n=== Benchmark Summary ===');
  for (const result of results) {
    console.log(
      `pageConcurrency=${result.pageConcurrency}: ${result.elapsedMs}ms (${result.totalPages} pages)`
    );
  }
  console.log(`Summary: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
