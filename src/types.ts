/**
 * MinerU TypeScript Client - Type Definitions
 * 基于 MinerU Python 客户端的 TypeScript 实现
 */

/** 块类型 - 对应 MinerU 的 BLOCK_TYPES */
export type BlockType =
  | 'text'
  | 'title'
  | 'paragraph'
  | 'image'
  | 'image_body'
  | 'image_caption'
  | 'image_footnote'
  | 'table'
  | 'table_body'
  | 'table_caption'
  | 'table_footnote'
  | 'code'
  | 'equation'
  | 'equation_block'
  | 'interline_equation'
  | 'inline_equation'
  | 'list'
  | 'header'
  | 'footer'
  | 'page_number'
  | 'ref_text'
  | 'algorithm'
  | 'aside_text'
  | 'phonetic'
  | 'unknown';

/** 内容块 - 对应 MinerU 的 ContentBlock */
export interface ContentBlock {
  type: BlockType;
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 归一化坐标 0-1
  angle?: 0 | 90 | 180 | 270;
  content?: string | null;

  // 扩展字段
  html?: string; // 表格的 HTML
  image_path?: string; // 图像路径
  level?: number; // 标题层级
}

/** 采样参数 - 对应 MinerU 的 SamplingParams */
export interface SamplingParams {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  repetition_penalty?: number;
  max_tokens?: number;
  stop?: string[];
  no_repeat_ngram_size?: number;
}

/** MinerU 默认采样参数 */
export const DEFAULT_SAMPLING_PARAMS: SamplingParams = {
  temperature: 0.0,
  top_p: 0.01,
  top_k: 1,
  presence_penalty: 0.0,
  frequency_penalty: 0.0,
  repetition_penalty: 1.0,
  max_tokens: 4096,
  no_repeat_ngram_size: 100,
};

/** PDF 转图像选项 */
export interface PDFToImageOptions {
  dpi?: number; // 默认 200
  startPage?: number; // 起始页（0-based）
  endPage?: number; // 结束页（0-based）
  scale?: number; // 缩放比例
}

/** 页面图像数据 */
export interface PageImage {
  pageIndex: number;
  width: number;
  height: number;
  scale: number;
  imageData: Buffer; // PNG 格式
  base64: string; // Base64 编码
}

/** VLM 客户端配置 */
export interface VLMClientConfig {
  serverUrl: string; // HTTP 服务器地址
  modelName?: string; // 模型名称（自动发现）
  apiKey?: string; // API 密钥
  timeout?: number; // 请求超时（毫秒）
  maxRetries?: number; // 最大重试次数
  maxConcurrency?: number; // 最大并发数
}

/** OpenAI 兼容的消息格式 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'auto' | 'low' | 'high';
    };
  }>;
}

/** OpenAI 兼容的请求体 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  repetition_penalty?: number;
  skip_special_tokens?: boolean;
  stream?: boolean;
  vllm_xargs?: {
    no_repeat_ngram_size?: number;
    debug?: boolean;
  };
  [key: string]: any;
}

/** OpenAI 兼容的响应 */
export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** MinerU 客户端配置 */
export interface MinerUClientConfig {
  serverUrl: string;
  modelName?: string;
  apiKey?: string;

  // 图像处理参数
  layoutImageSize?: [number, number]; // 布局检测的图像尺寸，默认 [1036, 1036]
  dpi?: number; // PDF 转图像的 DPI，默认 200
  outputDir?: string; // 输出目录（用于保存图片）
  minImageEdge?: number; // 裁剪后最小边长
  maxImageEdgeRatio?: number; // 裁剪后最大长宽比

  // 采样参数
  samplingParams?: {
    layout?: SamplingParams;
    text?: SamplingParams;
    table?: SamplingParams;
    equation?: SamplingParams;
  };

  // 提示词
  prompts?: {
    layout?: string;
    text?: string;
    table?: string;
    equation?: string;
  };

  // 后处理选项
  simplePostProcess?: boolean; // 仅简单后处理
  handleEquationBlock?: boolean; // 处理多行公式块
  abandonList?: boolean; // 丢弃列表块
  abandonParatext?: boolean; // 丢弃页眉页脚

  // HTTP 参数
  timeout?: number;
  maxRetries?: number;
  maxConcurrency?: number;

  // 页级执行控制
  pageConcurrency?: number; // 页面并发数（默认 1）
  pageRetryLimit?: number; // 单页重试次数（默认 2）
  skipFailedPages?: boolean; // 单页可重试错误耗尽后是否跳过（默认 true）
}

/** 解析结果 */
export interface ParseResult {
  pages: Array<{
    pageIndex: number;
    blocks: ContentBlock[];
  }>;
  markdown?: string;
  middleJson?: any;
  metadata: {
    totalPages: number;
    processingTime: number;
  };
}

/** MinerU 默认提示词 - 必须与 Python 版本完全一致！ */
export const DEFAULT_PROMPTS = {
  layout: '\nLayout Detection:',
  text: '\nText Recognition:',
  table: '\nTable Recognition:',
  equation: '\nFormula Recognition:',
};

/** 默认系统提示词 - 必须与 Python 版本一致！ */
export const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant.';

/** 错误类型 */
export class MinerUError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MinerUError';
  }
}

/** PDF 加载错误 */
export class PDFLoadError extends MinerUError {
  constructor(message: string, details?: any) {
    super(message, 'PDF_LOAD_ERROR', details);
    this.name = 'PDFLoadError';
  }
}

/** VLM 请求错误 */
export class VLMRequestError extends MinerUError {
  constructor(message: string, details?: any) {
    super(message, 'VLM_REQUEST_ERROR', details);
    this.name = 'VLMRequestError';
  }
}

/** 解析错误 */
export class ParseError extends MinerUError {
  constructor(message: string, details?: any) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'ParseError';
  }
}
