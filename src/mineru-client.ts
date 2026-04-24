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
  CropImageFormat,
  MinerUPagePerformanceMetrics,
  MinerUPerformanceMetrics,
  ParseResult,
  ParseFileOptions,
  PageImage,
  VLMRequestError,
  DEFAULT_PROMPTS,
  DEFAULT_SAMPLING_PARAMS,
  DEFAULT_SYSTEM_PROMPT,
} from './types';

const DEFAULT_PAGE_CONCURRENCY = 2;
const DEFAULT_PAGE_RETRY_LIMIT = 2;
const DEFAULT_MAX_CONCURRENCY = 10;
const DEFAULT_CROP_IMAGE_FORMAT: CropImageFormat = 'jpeg';
const DEFAULT_CROP_IMAGE_QUALITY = 0.75;
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
      cropImageFormat: config.cropImageFormat ?? DEFAULT_CROP_IMAGE_FORMAT,
      cropImageQuality: this.normalizeQuality(
        config.cropImageQuality,
        DEFAULT_CROP_IMAGE_QUALITY
      ),
      usePageCropCache: config.usePageCropCache ?? true,
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
      maxConcurrency: config.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
      keepAlive: config.keepAlive ?? true,
      performanceLogging: config.performanceLogging ?? false,
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
      keepAlive: this.config.keepAlive,
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

  private encodeCanvasAsDataUri(
    canvas: any,
    format: CropImageFormat = this.config.cropImageFormat,
    quality: number = this.config.cropImageQuality
  ): string {
    if (format === 'png') {
      const buffer = canvas.toBuffer('image/png');
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }

    const buffer = canvas.toBuffer('image/jpeg', { quality });
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }

  private rgbImageToCanvas(image: { rgbBuffer: Buffer; width: number; height: number }): any {
    const { createCanvas, ImageData } = require('canvas') as typeof import('canvas');
    const rgbaBuffer = Buffer.alloc(image.width * image.height * 4);

    for (
      let sourceIndex = 0, targetIndex = 0;
      sourceIndex < image.rgbBuffer.length;
      sourceIndex += 3, targetIndex += 4
    ) {
      rgbaBuffer[targetIndex] = image.rgbBuffer[sourceIndex];
      rgbaBuffer[targetIndex + 1] = image.rgbBuffer[sourceIndex + 1];
      rgbaBuffer[targetIndex + 2] = image.rgbBuffer[sourceIndex + 2];
      rgbaBuffer[targetIndex + 3] = 255;
    }

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(
      new Uint8ClampedArray(rgbaBuffer),
      image.width,
      image.height
    );
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  private getCropPixelBox(
    bbox: [number, number, number, number],
    imageWidth: number,
    imageHeight: number
  ): { left: number; top: number; width: number; height: number } {
    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    const [bboxLeft, bboxTop, bboxRight, bboxBottom] = bbox;
    const scale = Math.max(bboxLeft, bboxTop, bboxRight, bboxBottom) <= 1.5 ? 1 : 1000;
    const normLeft = clamp(bboxLeft, 0, scale);
    const normTop = clamp(bboxTop, 0, scale);
    const normRight = clamp(bboxRight, 0, scale);
    const normBottom = clamp(bboxBottom, 0, scale);

    const left = Math.floor((normLeft / scale) * imageWidth);
    const top = Math.floor((normTop / scale) * imageHeight);
    const right = Math.ceil((normRight / scale) * imageWidth);
    const bottom = Math.ceil((normBottom / scale) * imageHeight);

    const cropLeft = clamp(left, 0, imageWidth - 1);
    const cropTop = clamp(top, 0, imageHeight - 1);
    const cropRight = clamp(right, cropLeft + 1, imageWidth);
    const cropBottom = clamp(bottom, cropTop + 1, imageHeight);

    return {
      left: cropLeft,
      top: cropTop,
      width: Math.max(1, cropRight - cropLeft),
      height: Math.max(1, cropBottom - cropTop),
    };
  }

  private cropRgbFromPageImage(
    pageImage: PageImage,
    bbox: [number, number, number, number]
  ): { rgbBuffer: Buffer; width: number; height: number } | null {
    if (!pageImage.rgbBuffer) {
      return null;
    }

    const cropBox = this.getCropPixelBox(bbox, pageImage.width, pageImage.height);
    const cropBuffer = Buffer.alloc(cropBox.width * cropBox.height * 3);
    const sourceRowBytes = pageImage.width * 3;
    const targetRowBytes = cropBox.width * 3;

    for (let rowIndex = 0; rowIndex < cropBox.height; rowIndex += 1) {
      const sourceStart =
        (cropBox.top + rowIndex) * sourceRowBytes + cropBox.left * 3;
      const targetStart = rowIndex * targetRowBytes;
      pageImage.rgbBuffer.copy(
        cropBuffer,
        targetStart,
        sourceStart,
        sourceStart + targetRowBytes
      );
    }

    return {
      rgbBuffer: cropBuffer,
      width: cropBox.width,
      height: cropBox.height,
    };
  }

  private async cropImageFromPageImage(
    pageImage: PageImage,
    bbox: [number, number, number, number],
    format: CropImageFormat = this.config.cropImageFormat,
    quality: number = this.config.cropImageQuality
  ): Promise<string> {
    if (!this.config.usePageCropCache) {
      return this.cropImageFromBbox(
        pageImage.base64,
        bbox,
        pageImage.width,
        pageImage.height,
        format,
        quality
      );
    }

    const croppedRgb = this.cropRgbFromPageImage(pageImage, bbox);
    if (!croppedRgb) {
      return this.cropImageFromBbox(
        pageImage.base64,
        bbox,
        pageImage.width,
        pageImage.height,
        format,
        quality
      );
    }

    const canvas = this.rgbImageToCanvas(croppedRgb);
    const resized = this.resizeByNeed(canvas);
    return this.encodeCanvasAsDataUri(resized.canvas, format, quality);
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
        rgbBuffer: image.rgbBuffer,
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
    imageHeight: number,
    format: CropImageFormat = this.config.cropImageFormat,
    quality: number = this.config.cropImageQuality
  ): Promise<string> {
    const { createCanvas, loadImage } = await import('canvas');

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const img = await loadImage(imageBuffer);

    const cropBox = this.getCropPixelBox(bbox, imageWidth, imageHeight);

    const canvas = createCanvas(cropBox.width, cropBox.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      cropBox.left,
      cropBox.top,
      cropBox.width,
      cropBox.height,
      0,
      0,
      cropBox.width,
      cropBox.height
    );

    const resized = this.resizeByNeed(canvas);
    return this.encodeCanvasAsDataUri(resized.canvas, format, quality);
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

    const mimeMatch = imageBase64.match(/^data:image\/([\w.+-]+);base64,/u);
    const extension = mimeMatch?.[1] === 'jpeg' ? 'jpg' : (mimeMatch?.[1] ?? 'png');
    const base64Data = imageBase64.replace(/^data:image\/[\w.+-]+;base64,/, '');
    const hash = crypto.createHash('sha256').update(base64Data).digest('hex');
    const filename = `${hash}.${extension}`;

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
  async twoStepExtract(
    pageImage: PageImage,
    performance?: MinerUPerformanceMetrics
  ): Promise<ContentBlock[]> {
    const startTime = Date.now();
    const pageMetrics: MinerUPagePerformanceMetrics = {
      pageIndex: pageImage.pageIndex,
      totalMs: 0,
      layoutMs: 0,
      cropMs: 0,
      contentMs: 0,
      imageSaveMs: 0,
      postProcessMs: 0,
      blocks: 0,
      extractedBlocks: 0,
      savedImages: 0,
    };

    // Step 1: 布局检测
    console.log(`[Page ${pageImage.pageIndex}] Layout detection...`);
    let phaseStart = Date.now();
    const blocks = await this.layoutDetect(pageImage.base64);
    pageMetrics.layoutMs = Date.now() - phaseStart;
    pageMetrics.blocks = blocks.length;
    console.log(`[Page ${pageImage.pageIndex}] Found ${blocks.length} blocks`);

    // Step 2: 内容提取（裁剪图像后批量提取）
    console.log(`[Page ${pageImage.pageIndex}] Content extraction...`);
    const skipTypes = new Set(['image', 'list', 'equation_block']);
    const extractBlocks = blocks.filter((block) => !skipTypes.has(block.type));
    pageMetrics.extractedBlocks = extractBlocks.length;
    phaseStart = Date.now();
    const extractRequests = await Promise.all(
      extractBlocks.map(async (block) => {
        const croppedImage = await this.cropImageFromPageImage(pageImage, block.bbox);
        return {
          imageBase64: croppedImage,
          blockType: block.type,
        };
      })
    );
    pageMetrics.cropMs = Date.now() - phaseStart;

    if (extractRequests.length > 0) {
      phaseStart = Date.now();
      const contents = await this.batchContentExtract(extractRequests);
      pageMetrics.contentMs = Date.now() - phaseStart;
      applyExtractedContents(blocks, skipTypes, contents);
    }

    // Step 3: 保存图像块
    if (this.config.outputDir) {
      const imageBlocks = blocks.filter((block) => block.type === 'image');
      pageMetrics.savedImages = imageBlocks.length;
      phaseStart = Date.now();
      await Promise.all(
        imageBlocks.map(async (block) => {
          const croppedImage = await this.cropImageFromPageImage(
            pageImage,
            block.bbox,
            'png'
          );
          block.image_path = await this.saveBlockImage(
            croppedImage,
            this.config.outputDir
          );
        })
      );
      pageMetrics.imageSaveMs = Date.now() - phaseStart;
    }

    // Step 4: 后处理
    phaseStart = Date.now();
    const processed = postProcessBlocks(blocks, {
      simplePostProcess: this.config.simplePostProcess,
      handleEquationBlock: this.config.handleEquationBlock,
      abandonList: this.config.abandonList,
      abandonParatext: this.config.abandonParatext,
    });
    pageMetrics.postProcessMs = Date.now() - phaseStart;

    const elapsed = Date.now() - startTime;
    pageMetrics.totalMs = elapsed;
    this.recordPagePerformance(performance, pageMetrics);
    console.log(`[Page ${pageImage.pageIndex}] Completed in ${elapsed}ms`);

    return processed;
  }

  /**
   * 批量两步提取
   */
  async batchTwoStepExtract(
    pageImages: PageImage[],
    performance?: MinerUPerformanceMetrics
  ): Promise<ContentBlock[][]> {
    const results: ContentBlock[][] = new Array(pageImages.length);
    const pageConcurrency = this.config.pageConcurrency;

    for (let i = 0; i < pageImages.length; i += pageConcurrency) {
      const batch = pageImages.slice(i, i + pageConcurrency);
      await Promise.all(
        batch.map(async (pageImage, offset) => {
          const pageIndex = i + offset;
          try {
            results[pageIndex] = await this.runPageWithRetry(pageImage, performance);
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

  private async runPageWithRetry(
    pageImage: PageImage,
    performance?: MinerUPerformanceMetrics
  ): Promise<ContentBlock[]> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= this.config.pageRetryLimit; attempt += 1) {
      try {
        return await this.twoStepExtract(pageImage, performance);
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

  private normalizeQuality(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1) {
      return value;
    }
    return fallback;
  }

  private createPerformanceMetrics(): MinerUPerformanceMetrics {
    return {
      totalMs: 0,
      readMs: 0,
      renderMs: 0,
      pageImageEncodeMs: 0,
      layoutMs: 0,
      cropMs: 0,
      contentMs: 0,
      imageSaveMs: 0,
      postProcessMs: 0,
      middleJsonMs: 0,
      markdownMs: 0,
      pages: [],
    };
  }

  private recordPagePerformance(
    performance: MinerUPerformanceMetrics | undefined,
    pageMetrics: MinerUPagePerformanceMetrics
  ): void {
    if (!performance) {
      return;
    }

    performance.pages.push(pageMetrics);
    performance.layoutMs += pageMetrics.layoutMs;
    performance.cropMs += pageMetrics.cropMs;
    performance.contentMs += pageMetrics.contentMs;
    performance.imageSaveMs += pageMetrics.imageSaveMs;
    performance.postProcessMs += pageMetrics.postProcessMs;
  }

  private printPerformanceSummary(performance: MinerUPerformanceMetrics): void {
    if (!this.config.performanceLogging) {
      return;
    }

    console.log('=== MinerU Performance ===');
    console.log(`total=${performance.totalMs}ms`);
    console.log(`read=${performance.readMs}ms render=${performance.renderMs}ms encode=${performance.pageImageEncodeMs}ms`);
    console.log(`layout=${performance.layoutMs}ms crop=${performance.cropMs}ms content=${performance.contentMs}ms`);
    console.log(`imageSave=${performance.imageSaveMs}ms postProcess=${performance.postProcessMs}ms`);
    console.log(`middleJson=${performance.middleJsonMs}ms markdown=${performance.markdownMs}ms`);
  }

  /**
   * 解析 PDF 文件
   */
  async parseFile(pdfPath: string, options: ParseFileOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    const performance = this.createPerformanceMetrics();

    const fs = await import('fs/promises');
    let phaseStart = Date.now();
    const pdfBytes = await fs.readFile(pdfPath);
    performance.readMs = Date.now() - phaseStart;
    console.log('Loading PDF...');
    phaseStart = Date.now();
    const pageLimit = this.normalizeNonNegativeInt(options.pageLimit, 0);
    const { images, pdfDoc, pdfLib } = await loadImagesFromPdfBytes(
      pdfBytes,
      this.config.dpi,
      0,
      pageLimit > 0 ? pageLimit - 1 : null
    );
    performance.renderMs = Date.now() - phaseStart;
    phaseStart = Date.now();
    const pageImages = this.buildPageImagesFromPdfium(images);
    performance.pageImageEncodeMs = Date.now() - phaseStart;
    console.log(`Loaded ${pageImages.length} pages`);

    const imageWriter = await this.createImageWriter(this.config.outputDir);
    console.log('Processing pages...');
    const pageBlocks = await this.batchTwoStepExtract(pageImages, performance);

    let middleJson: any;
    try {
      const normalizedBlocks = pageBlocks.map((blocks) =>
        this.normalizeBlocksToUnit(blocks)
      );
      phaseStart = Date.now();
      middleJson = resultToMiddleJson(
        normalizedBlocks,
        images,
        pdfDoc,
        imageWriter
      );
      performance.middleJsonMs = Date.now() - phaseStart;
    } finally {
      pdfDoc.destroy();
      pdfLib.destroy();
    }

    phaseStart = Date.now();
    const markdown =
      unionMake(middleJson.pdf_info, MakeMode.MM_MD, 'images') || '';
    performance.markdownMs = Date.now() - phaseStart;
    const processingTime = Date.now() - startTime;
    performance.totalMs = processingTime;
    this.printPerformanceSummary(performance);

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
        performance,
      },
    };
  }

  /**
   * 解析 PDF Buffer
   */
  async parseBuffer(pdfBuffer: Buffer, options: ParseFileOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    const performance = this.createPerformanceMetrics();

    console.log('Loading PDF buffer...');
    let phaseStart = Date.now();
    const pageLimit = this.normalizeNonNegativeInt(options.pageLimit, 0);
    const { images, pdfDoc, pdfLib } = await loadImagesFromPdfBytes(
      pdfBuffer,
      this.config.dpi,
      0,
      pageLimit > 0 ? pageLimit - 1 : null
    );
    performance.renderMs = Date.now() - phaseStart;
    phaseStart = Date.now();
    const pageImages = this.buildPageImagesFromPdfium(images);
    performance.pageImageEncodeMs = Date.now() - phaseStart;
    console.log(`Loaded ${pageImages.length} pages`);

    const imageWriter = await this.createImageWriter(this.config.outputDir);
    console.log('Processing pages...');
    const pageBlocks = await this.batchTwoStepExtract(pageImages, performance);

    let middleJson: any;
    try {
      const normalizedBlocks = pageBlocks.map((blocks) =>
        this.normalizeBlocksToUnit(blocks)
      );
      phaseStart = Date.now();
      middleJson = resultToMiddleJson(
        normalizedBlocks,
        images,
        pdfDoc,
        imageWriter
      );
      performance.middleJsonMs = Date.now() - phaseStart;
    } finally {
      pdfDoc.destroy();
      pdfLib.destroy();
    }

    phaseStart = Date.now();
    const markdown =
      unionMake(middleJson.pdf_info, MakeMode.MM_MD, 'images') || '';
    performance.markdownMs = Date.now() - phaseStart;
    const processingTime = Date.now() - startTime;
    performance.totalMs = processingTime;
    this.printPerformanceSummary(performance);

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
        performance,
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
