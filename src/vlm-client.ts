/**
 * VLM HTTP 客户端
 * 与 OpenAI 兼容的 VLM 服务器通信
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  VLMClientConfig,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  SamplingParams,
  VLMRequestError,
  DEFAULT_SAMPLING_PARAMS,
} from './types';

export class VLMClient {
  private client: AxiosInstance;
  private modelName: string | null = null;
  private config: Required<VLMClientConfig>;

  constructor(config: VLMClientConfig) {
    this.config = {
      serverUrl: config.serverUrl,
      modelName: config.modelName ?? '',
      apiKey: config.apiKey ?? '',
      timeout: config.timeout ?? 600000, // 10 分钟
      maxRetries: config.maxRetries ?? 3,
      maxConcurrency: config.maxConcurrency ?? 100,
    };

    // 创建 axios 实例
    this.client = axios.create({
      baseURL: this.config.serverUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
    });

    // 添加重试逻辑
    this.setupRetry();
  }

  /**
   * 设置重试机制
   */
  private setupRetry() {
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as any;
        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry >= this.config.maxRetries) {
          return Promise.reject(error);
        }

        config.retry += 1;

        // 指数退避
        const delay = Math.pow(2, config.retry) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.client.request(config);
      }
    );
  }

  /**
   * 初始化（自动发现模型）
   */
  async initialize(): Promise<void> {
    if (!this.config.modelName) {
      try {
        const response = await this.client.get('/v1/models');
        const models = response.data.data || [];

        if (models.length === 0) {
          throw new VLMRequestError('No models available on server');
        }

        this.modelName = models[0].id;
        console.log(`Auto-discovered model: ${this.modelName}`);
      } catch (error: any) {
        throw new VLMRequestError(
          `Failed to discover models: ${error.message}`,
          error
        );
      }
    } else {
      this.modelName = this.config.modelName;
    }
  }

  /**
   * 单图像预测
   * 注意：接受 Buffer 或 Base64 字符串
   */
  async predict(
    imageData: Buffer | string,
    prompt: string,
    systemPrompt?: string,
    samplingParams?: SamplingParams
  ): Promise<string> {
    if (!this.modelName) {
      await this.initialize();
    }

    // 转换图像为 Base64（移除 data URI 前缀）
    let imageBase64: string;
    if (Buffer.isBuffer(imageData)) {
      imageBase64 = imageData.toString('base64');
    } else {
      // 移除可能的 data URI 前缀
      imageBase64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    }

    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // 根据 OpenAI Vision API 规范，使用 data URI 格式
    // 注意：必须添加 detail: "high" 以匹配 Python 实现
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${imageBase64}`,
            detail: 'high',
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    });

    // 合并采样参数
    const mergedParams = {
      ...DEFAULT_SAMPLING_PARAMS,
      ...samplingParams,
    };

    // 构建请求体
    const requestBody: ChatCompletionRequest = {
      model: this.modelName!,
      messages,
      temperature: mergedParams.temperature,
      top_p: mergedParams.top_p,
      top_k: mergedParams.top_k,
      presence_penalty: mergedParams.presence_penalty,
      frequency_penalty: mergedParams.frequency_penalty,
      repetition_penalty: mergedParams.repetition_penalty,
      max_tokens: mergedParams.max_tokens,
      skip_special_tokens: false, // 关键：不跳过特殊标记
    };

    // 添加 vllm_xargs（如果有 no_repeat_ngram_size）
    if (mergedParams.no_repeat_ngram_size !== undefined) {
      requestBody.vllm_xargs = {
        no_repeat_ngram_size: mergedParams.no_repeat_ngram_size,
        debug: false,
      };
    }

    // 调试：打印请求体（移除图像数据）
    if (process.env.DEBUG_VLM) {
      const debugBody = JSON.parse(JSON.stringify(requestBody));
      if (debugBody.messages) {
        for (const msg of debugBody.messages) {
          if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'image_url' && part.image_url?.url) {
                part.image_url.url = `<base64 data: ${part.image_url.url.length} chars>`;
              }
            }
          }
        }
      }
      console.log('=== 请求体 ===');
      console.log(JSON.stringify(debugBody, null, 2));
    }

    const maxEmptyRetries = this.config.maxRetries;
    for (let attempt = 0; attempt <= maxEmptyRetries; attempt += 1) {
      try {
        const response = await this.client.post<ChatCompletionResponse>(
          '/v1/chat/completions',
          requestBody
        );

        const content = response.data.choices[0]?.message?.content;
        if (content) {
          return content;
        }
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status;
          const message = error.response?.data?.error?.message || error.message;
          throw new VLMRequestError(
            `VLM request failed (${statusCode}): ${message}`,
            {
              statusCode,
              response: error.response?.data,
            }
          );
        }
        throw new VLMRequestError(`VLM request failed: ${error.message}`, error);
      }

      if (attempt < maxEmptyRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new VLMRequestError('Empty response from VLM server');
  }

  /**
   * 批量预测（并发控制）
   */
  async batchPredict(
    requests: Array<{
      imageBase64: string;
      prompt: string;
      systemPrompt?: string;
      samplingParams?: SamplingParams;
    }>
  ): Promise<string[]> {
    if (!this.modelName) {
      await this.initialize();
    }

    // 使用信号量控制并发
    const results: string[] = new Array(requests.length);
    const concurrency = this.config.maxConcurrency;

    const executeRequest = async (index: number) => {
      const req = requests[index];
      try {
        results[index] = await this.predict(
          req.imageBase64,
          req.prompt,
          req.systemPrompt,
          req.samplingParams
        );
      } catch (error) {
        console.error(`Request ${index} failed:`, error);
        results[index] = ''; // 失败的请求返回空字符串
      }
    };

    // 批量执行（并发控制）
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const promises = batch.map((_, batchIndex) =>
        executeRequest(i + batchIndex)
      );
      await Promise.all(promises);
    }

    return results;
  }

  /**
   * 流式预测（暂不实现）
   */
  async streamPredict(
    imageBase64: string,
    prompt: string,
    systemPrompt?: string,
    samplingParams?: SamplingParams,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    // TODO: 实现流式预测
    throw new Error('Stream predict not implemented yet');
  }
}
