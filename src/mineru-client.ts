/**
 * MinerU 主客户端
 * 完整的文档解析流程
 */

import { VLMClient } from './vlm-client';
import {
  parseLayoutDetection,
  postProcessBlocks,
} from './post-process';
import { loadImagesFromPdfBytes, type ImageWriter } from './vlm-parity/pdf-image-tools';
import { imageToBytes, type PdfPageImage } from './vlm-parity/pdf-reader';
import { resultToMiddleJson } from './vlm-parity/model-output-to-middle-json';
import { unionMake } from './vlm-parity/vlm-middle-json-mkcontent';
import { MakeMode } from './vlm-parity/enum';
import { applyExtractedContents } from './content-extract-utils';
import {
  MinerUClientConfig,
  ContentBlock,
  ParseResult,
  PageImage,
  VLMRequestError,
  DEFAULT_PROMPTS,
  DEFAULT_SAMPLING_PARAMS,
  DEFAULT_SYSTEM_PROMPT,
} from './types';

const DEFAULT_PAGE_CONCURRENCY = 1;
const DEFAULT_PAGE_RETRY_LIMIT = 2;
const RETRYABLE_NETWORK_ERROR_PATTERN =
  /EHOSTDOWN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up|fetch failed|network error/iu;

export class MinerUClient {
  private vlmClient: VLMClient;
  private config: Required<MinerUClientConfig>;

  constructor(config: MinerUClientConfig) {
    // 合并默认配置
    this.config = {
      serverUrl: config.serverUrl,
      modelName: config.modelName ?? '',
      apiKey: config.apiKey ?? '',
      layoutImageSize: config.layoutImageSize ?? [1036, 1036],
      dpi: config.dpi ?? 200,
      outputDir: config.outputDir ?? '',
      minImageEdge: config.minImageEdge ?? 28,
      maxImageEdgeRatio: config.maxImageEdgeRatio ?? 50,
      samplingParams: {
        layout: { ...DEFAULT_SAMPLING_PARAMS, ...config.samplingParams?.layout },
        text: { ...DEFAULT_SAMPLING_PARAMS, ...config.samplingParams?.text },
        table: { ...DEFAULT_SAMPLING_PARAMS, ...config.samplingParams?.table },
        equation: { ...DEFAULT_SAMPLING_PARAMS, ...config.samplingParams?.equation },
      },
      prompts: {
        layout: config.prompts?.layout ?? DEFAULT_PROMPTS.layout,
        text: config.prompts?.text ?? DEFAULT_PROMPTS.text,
        table: config.prompts?.table ?? DEFAULT_PROMPTS.table,
        equation: config.prompts?.equation ?? DEFAULT_PROMPTS.equation,
      },
      simplePostProcess: config.simplePostProcess ?? false,
      handleEquationBlock: config.handleEquationBlock ?? true,
      abandonList: config.abandonList ?? false,
      abandonParatext: config.abandonParatext ?? false,
      timeout: config.timeout ?? 600000,
      maxRetries: config.maxRetries ?? 3,
      maxConcurrency: config.maxConcurrency ?? 100,
      pageConcurrency: this.normalizePositiveInt(
        config.pageConcurrency,
        DEFAULT_PAGE_CONCURRENCY
      ),
      pageRetryLimit: this.normalizeNonNegativeInt(
        config.pageRetryLimit,
        DEFAULT_PAGE_RETRY_LIMIT
      ),
      skipFailedPages: config.skipFailedPages ?? true,
    };

    // 创建 VLM 客户端
    this.vlmClient = new VLMClient({
      serverUrl: this.config.serverUrl,
      modelName: this.config.modelName,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      maxConcurrency: this.config.maxConcurrency,
    });
  }

  /**
   * 初始化客户端
   */
  async initialize(): Promise<void> {
    await this.vlmClient.initialize();
  }

  /**
   * 布局检测
   */
  async layoutDetect(imageBase64: string): Promise<ContentBlock[]> {
    // Python 版本会将图像 resize 到 layout_image_size
    // 这对 MinerU 模型很重要！
    const resizedBase64 = await this.resizeImageForLayout(imageBase64);

    const rawOutput = await this.vlmClient.predict(
      resizedBase64,
      this.config.prompts.layout!,
      DEFAULT_SYSTEM_PROMPT, // 关键：必须使用默认 system prompt
      this.config.samplingParams.layout
    );

    return parseLayoutDetection(rawOutput);
  }

  /**
   * 调整图像尺寸用于布局检测
   */
  private async resizeImageForLayout(imageBase64: string): Promise<string> {
    const { createCanvas, loadImage } = await import('canvas');

    // 移除 data:image/png;base64, 前缀
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const img = await loadImage(imageBuffer);
    const [targetWidth, targetHeight] = this.config.layoutImageSize;

    const canvas = createCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');

    // 使用插值（类似 PIL 的 BICUBIC）
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const resizedBuffer = canvas.toBuffer('image/png');
    return `data:image/png;base64,${resizedBuffer.toString('base64')}`;
  }

  private resizeByNeed(image: { width: number; height: number }): { canvas: any; width: number; height: number } {
    const { createCanvas } = require('canvas') as typeof import('canvas');
    let canvas: any = image;
    let width = image.width;
    let height = image.height;

    const edgeRatio = Math.max(width, height) / Math.min(width, height);
    if (edgeRatio > this.config.maxImageEdgeRatio) {
      let newW = width;
      let newH = height;
      if (width > height) {
        newH = Math.ceil(width / this.config.maxImageEdgeRatio);
      } else {
        newW = Math.ceil(height / this.config.maxImageEdgeRatio);
      }
      const paddedCanvas = createCanvas(newW, newH);
      const paddedCtx = paddedCanvas.getContext('2d');
      paddedCtx.fillStyle = '#ffffff';
      paddedCtx.fillRect(0, 0, newW, newH);
      const offsetX = Math.floor((newW - width) / 2);
      const offsetY = Math.floor((newH - height) / 2);
      paddedCtx.drawImage(canvas, offsetX, offsetY);
      canvas = paddedCanvas;
      width = newW;
      height = newH;
    }

    if (Math.min(width, height) < this.config.minImageEdge) {
      const scale = this.config.minImageEdge / Math.min(width, height);
      const newW = Math.ceil(width * scale);
      const newH = Math.ceil(height * scale);
      const resizedCanvas = createCanvas(newW, newH);
      const resizedCtx = resizedCanvas.getContext('2d');
      resizedCtx.imageSmoothingEnabled = true;
      resizedCtx.drawImage(canvas, 0, 0, newW, newH);
      canvas = resizedCanvas;
      width = newW;
      height = newH;
    }

    return { canvas, width, height };
  }

  private buildPageImagesFromPdfium(images: PdfPageImage[]): PageImage[] {
    return images.map((image, index) => {
      const bytes = imageToBytes(image, 0.75);
      const base64 = bytes.toString('base64');
      return {
        pageIndex: index,
        width: image.width,
        height: image.height,
        scale: image.scale,
        imageData: bytes,
        base64: `data:image/jpeg;base64,${base64}`,
      };
    });
  }

  private normalizeBlocksToUnit(blocks: ContentBlock[]): ContentBlock[] {
    return blocks.map((block) => {
      const maxVal = Math.max(...block.bbox);
      if (maxVal > 1.5) {
        const bbox: [number, number, number, number] = [
          block.bbox[0] / 1000,
          block.bbox[1] / 1000,
          block.bbox[2] / 1000,
          block.bbox[3] / 1000,
        ];
        return { ...block, bbox };
      }
      return block;
    });
  }

  private async createImageWriter(outputDir: string): Promise<ImageWriter | null> {
    if (!outputDir) {
      return null;
    }
    const fs = await import('fs/promises');
    const path = await import('path');
    const imagesDir = path.join(outputDir, 'images');
    await fs.mkdir(imagesDir, { recursive: true });
    return {
      write: async (relativePath: string, data: Buffer) => {
        const target = path.join(imagesDir, relativePath);
        const parent = path.dirname(target);
        await fs.mkdir(parent, { recursive: true });
        await fs.writeFile(target, data);
      },
    };
  }

  /**
   * 按 bbox 裁剪图像（bbox 为 0-1000 归一化坐标）
   */
  private async cropImageFromBbox(
    imageBase64: string,
    bbox: [number, number, number, number],
    imageWidth: number,
    imageHeight: number
  ): Promise<string> {
    const { createCanvas, loadImage } = await import('canvas');

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const img = await loadImage(imageBuffer);

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    const [x0, y0, x1, y1] = bbox;
    const scale = Math.max(x0, y0, x1, y1) <= 1.5 ? 1 : 1000;
    const normX0 = clamp(x0, 0, scale);
    const normY0 = clamp(y0, 0, scale);
    const normX1 = clamp(x1, 0, scale);
    const normY1 = clamp(y1, 0, scale);

    const left = Math.floor((normX0 / scale) * imageWidth);
    const top = Math.floor((normY0 / scale) * imageHeight);
    const right = Math.ceil((normX1 / scale) * imageWidth);
    const bottom = Math.ceil((normY1 / scale) * imageHeight);

    const cropLeft = clamp(left, 0, imageWidth - 1);
    const cropTop = clamp(top, 0, imageHeight - 1);
    const cropRight = clamp(right, cropLeft + 1, imageWidth);
    const cropBottom = clamp(bottom, cropTop + 1, imageHeight);

    const cropWidth = Math.max(1, cropRight - cropLeft);
    const cropHeight = Math.max(1, cropBottom - cropTop);

    const canvas = createCanvas(cropWidth, cropHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      cropLeft,
      cropTop,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    const resized = this.resizeByNeed(canvas);
    const croppedBuffer = resized.canvas.toBuffer('image/png');
    return `data:image/png;base64,${croppedBuffer.toString('base64')}`;
  }

  /**
   * 保存图像块到输出目录
   */
  private async saveBlockImage(
    imageBase64: string,
    outputDir: string
  ): Promise<string> {
    const crypto = await import('crypto');
    const fs = await import('fs/promises');
    const path = await import('path');

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const hash = crypto.createHash('sha256').update(base64Data).digest('hex');
    const filename = `${hash}.png`;

    const imagesDir = path.join(outputDir, 'images');
    await fs.mkdir(imagesDir, { recursive: true });

    const filepath = path.join(imagesDir, filename);
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filepath, buffer);

    return filename;
  }

  /**
   * 批量布局检测
   */
  async batchLayoutDetect(imagesBase64: string[]): Promise<ContentBlock[][]> {
    const requests = imagesBase64.map((imageBase64) => ({
      imageBase64,
      prompt: this.config.prompts.layout!,
      samplingParams: this.config.samplingParams.layout,
    }));

    const rawOutputs = await this.vlmClient.batchPredict(requests);
    return rawOutputs.map((output) => parseLayoutDetection(output));
  }

  /**
   * 内容提取
   */
  async contentExtract(
    imageBase64: string,
    blockType: string
  ): Promise<string> {
    // 根据块类型选择提示词和采样参数
    let prompt = this.config.prompts.text;
    let samplingParams = this.config.samplingParams.text;

    if (blockType === 'table') {
      prompt = this.config.prompts.table;
      samplingParams = this.config.samplingParams.table;
    } else if (blockType.includes('equation')) {
      prompt = this.config.prompts.equation;
      samplingParams = this.config.samplingParams.equation;
    }

    return await this.vlmClient.predict(
      imageBase64,
      prompt!,
      DEFAULT_SYSTEM_PROMPT,
      samplingParams
    );
  }

  /**
   * 批量内容提取
   */
  async batchContentExtract(
    requests: Array<{ imageBase64: string; blockType: string }>
  ): Promise<string[]> {
    const vlmRequests = requests.map(({ imageBase64, blockType }) => {
      let prompt = this.config.prompts.text;
      let samplingParams = this.config.samplingParams.text;

      if (blockType === 'table') {
        prompt = this.config.prompts.table;
        samplingParams = this.config.samplingParams.table;
      } else if (blockType.includes('equation')) {
        prompt = this.config.prompts.equation;
        samplingParams = this.config.samplingParams.equation;
      }

      return { imageBase64, prompt: prompt!, samplingParams };
    });

    return await this.vlmClient.batchPredict(vlmRequests);
  }

  /**
   * 两步提取（布局检测 + 内容提取）
   */
  async twoStepExtract(pageImage: PageImage): Promise<ContentBlock[]> {
    const startTime = Date.now();

    // Step 1: 布局检测
    console.log(`[Page ${pageImage.pageIndex}] Layout detection...`);
    const blocks = await this.layoutDetect(pageImage.base64);
    console.log(`[Page ${pageImage.pageIndex}] Found ${blocks.length} blocks`);

    // Step 2: 内容提取（裁剪图像后批量提取）
    console.log(`[Page ${pageImage.pageIndex}] Content extraction...`);
    const skipTypes = new Set(['image', 'list', 'equation_block']);
    const extractBlocks = blocks.filter((block) => !skipTypes.has(block.type));
    const extractRequests = await Promise.all(
      extractBlocks.map(async (block) => {
        const croppedImage = await this.cropImageFromBbox(
          pageImage.base64,
          block.bbox,
          pageImage.width,
          pageImage.height
        );
        return {
          imageBase64: croppedImage,
          blockType: block.type,
        };
      })
    );

    if (extractRequests.length > 0) {
      const contents = await this.batchContentExtract(extractRequests);
      applyExtractedContents(blocks, skipTypes, contents);
    }

    // Step 3: 保存图像块
    if (this.config.outputDir) {
      const imageBlocks = blocks.filter((block) => block.type === 'image');
      await Promise.all(
        imageBlocks.map(async (block) => {
          const croppedImage = await this.cropImageFromBbox(
            pageImage.base64,
            block.bbox,
            pageImage.width,
            pageImage.height
          );
          block.image_path = await this.saveBlockImage(
            croppedImage,
            this.config.outputDir
          );
        })
      );
    }

    // Step 4: 后处理
    const processed = postProcessBlocks(blocks, {
      simplePostProcess: this.config.simplePostProcess,
      handleEquationBlock: this.config.handleEquationBlock,
      abandonList: this.config.abandonList,
      abandonParatext: this.config.abandonParatext,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[Page ${pageImage.pageIndex}] Completed in ${elapsed}ms`);

    return processed;
  }

  /**
   * 批量两步提取
   */
  async batchTwoStepExtract(pageImages: PageImage[]): Promise<ContentBlock[][]> {
    const results: ContentBlock[][] = new Array(pageImages.length);
    const pageConcurrency = this.config.pageConcurrency;

    for (let i = 0; i < pageImages.length; i += pageConcurrency) {
      const batch = pageImages.slice(i, i + pageConcurrency);
      await Promise.all(
        batch.map(async (pageImage, offset) => {
          const pageIndex = i + offset;
          try {
            results[pageIndex] = await this.runPageWithRetry(pageImage);
          } catch (error) {
            if (this.config.skipFailedPages && this.isRetryablePageError(error)) {
              const detail = error instanceof Error ? error.message : String(error);
              console.warn(`⚠️ [Page ${pageImage.pageIndex}] Failed after retries, skipped: ${detail}`);
              results[pageIndex] = [];
              return;
            }
            throw error;
          }
        })
      );
    }

    return results;
  }

  private async runPageWithRetry(pageImage: PageImage): Promise<ContentBlock[]> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= this.config.pageRetryLimit; attempt += 1) {
      try {
        return await this.twoStepExtract(pageImage);
      } catch (error) {
        lastError = error;
        if (!this.isRetryablePageError(error) || attempt >= this.config.pageRetryLimit) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
      }
    }

    throw (lastError as Error) ?? new Error(`Page ${pageImage.pageIndex} parse failed`);
  }

  private isRetryablePageError(error: unknown): boolean {
    if (error instanceof Error && this.isEmptyResponseError(error.message)) {
      return true;
    }

    if (error instanceof VLMRequestError) {
      const details = this.toRecord(error.details);
      const statusCode = details?.statusCode;
      if (statusCode === undefined || statusCode === null) {
        return true;
      }
      if (typeof statusCode === 'number' && (statusCode === 429 || statusCode >= 500)) {
        return true;
      }
    }

    if (error instanceof Error && RETRYABLE_NETWORK_ERROR_PATTERN.test(error.message)) {
      return true;
    }

    return false;
  }

  private isEmptyResponseError(message: string): boolean {
    return /Empty response from VLM server/u.test(message);
  }

  private toRecord(value: unknown): Record<string, any> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, any>;
  }

  private normalizePositiveInt(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
      return Math.floor(value);
    }
    return fallback;
  }

  private normalizeNonNegativeInt(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return Math.floor(value);
    }
    return fallback;
  }

  /**
   * 解析 PDF 文件
   */
  async parseFile(pdfPath: string): Promise<ParseResult> {
    const startTime = Date.now();

    const fs = await import('fs/promises');
    const pdfBytes = await fs.readFile(pdfPath);
    console.log('Loading PDF...');
    const { images, pdfDoc, pdfLib } = await loadImagesFromPdfBytes(
      pdfBytes,
      this.config.dpi
    );
    const pageImages = this.buildPageImagesFromPdfium(images);
    console.log(`Loaded ${pageImages.length} pages`);

    console.log('Processing pages...');
    const pageBlocks = await this.batchTwoStepExtract(pageImages);
    const imageWriter = await this.createImageWriter(this.config.outputDir);

    let middleJson: any;
    try {
      const normalizedBlocks = pageBlocks.map((blocks) =>
        this.normalizeBlocksToUnit(blocks)
      );
      middleJson = resultToMiddleJson(
        normalizedBlocks,
        images,
        pdfDoc,
        imageWriter
      );
    } finally {
      pdfDoc.destroy();
      pdfLib.destroy();
    }

    const markdown =
      unionMake(middleJson.pdf_info, MakeMode.MM_MD, 'images') || '';
    const processingTime = Date.now() - startTime;

    return {
      pages: pageImages.map((img, idx) => ({
        pageIndex: img.pageIndex,
        blocks: pageBlocks[idx] || [],
      })),
      markdown,
      middleJson,
      metadata: {
        totalPages: pageImages.length,
        processingTime,
      },
    };
  }

  /**
   * 解析 PDF Buffer
   */
  async parseBuffer(pdfBuffer: Buffer): Promise<ParseResult> {
    const startTime = Date.now();

    console.log('Loading PDF buffer...');
    const { images, pdfDoc, pdfLib } = await loadImagesFromPdfBytes(
      pdfBuffer,
      this.config.dpi
    );
    const pageImages = this.buildPageImagesFromPdfium(images);
    console.log(`Loaded ${pageImages.length} pages`);

    console.log('Processing pages...');
    const pageBlocks = await this.batchTwoStepExtract(pageImages);
    const imageWriter = await this.createImageWriter(this.config.outputDir);

    let middleJson: any;
    try {
      const normalizedBlocks = pageBlocks.map((blocks) =>
        this.normalizeBlocksToUnit(blocks)
      );
      middleJson = resultToMiddleJson(
        normalizedBlocks,
        images,
        pdfDoc,
        imageWriter
      );
    } finally {
      pdfDoc.destroy();
      pdfLib.destroy();
    }

    const markdown =
      unionMake(middleJson.pdf_info, MakeMode.MM_MD, 'images') || '';
    const processingTime = Date.now() - startTime;

    return {
      pages: pageImages.map((img, idx) => ({
        pageIndex: img.pageIndex,
        blocks: pageBlocks[idx] || [],
      })),
      markdown,
      middleJson,
      metadata: {
        totalPages: pageImages.length,
        processingTime,
      },
    };
  }

  /**
   * 转换结果为 Markdown
   */
  resultToMarkdown(result: ParseResult, imagePath: string = 'images'): string {
    if (result.markdown !== undefined) {
      return result.markdown;
    }
    if (result.middleJson) {
      return unionMake(result.middleJson.pdf_info, MakeMode.MM_MD, imagePath) || '';
    }
    return '';
  }

  /**
   * 转换结果为内容列表
   */
  resultToContentList(result: ParseResult): any[] {
    if (result.middleJson) {
      const contentList = unionMake(
        result.middleJson.pdf_info,
        MakeMode.CONTENT_LIST,
        'images'
      );
      return contentList || [];
    }
    return [];
  }
}
