import { MinerUClientConfig, ParseFileOptions, CropImageFormat } from './types';

function envString(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function envNumber(name: string, fallback?: number): number | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envInteger(name: string, fallback?: number): number | undefined {
  const parsed = envNumber(name, fallback);
  return parsed === undefined ? undefined : Math.floor(parsed);
}

function envBoolean(name: string, fallback?: boolean): boolean | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function envCropImageFormat(fallback?: CropImageFormat): CropImageFormat | undefined {
  const value = envString('MINERU_CROP_IMAGE_FORMAT');
  if (value === 'jpeg' || value === 'png') {
    return value;
  }
  return fallback;
}

export function loadMinerUConfigFromEnv(
  defaults: Partial<MinerUClientConfig> = {}
): MinerUClientConfig {
  return {
    ...defaults,
    serverUrl:
      envString('MINERU_SERVER_URL', defaults.serverUrl) ?? 'http://localhost:30000',
    modelName:
      envString('MINERU_VL_MODEL_NAME') ??
      envString('MINERU_MODEL_NAME', defaults.modelName),
    apiKey: envString('MINERU_API_KEY', defaults.apiKey),
    outputDir: envString('MINERU_OUTPUT_DIR', defaults.outputDir),
    dpi: envInteger('MINERU_DPI', defaults.dpi),
    maxConcurrency: envInteger('MINERU_MAX_CONCURRENCY', defaults.maxConcurrency),
    pageConcurrency: envInteger('MINERU_PAGE_CONCURRENCY', defaults.pageConcurrency),
    pageRetryLimit: envInteger('MINERU_PAGE_RETRY_LIMIT', defaults.pageRetryLimit),
    timeout: envInteger('MINERU_TIMEOUT_MS', defaults.timeout),
    maxRetries: envInteger('MINERU_MAX_RETRIES', defaults.maxRetries),
    minImageEdge: envInteger('MINERU_MIN_IMAGE_EDGE', defaults.minImageEdge),
    maxImageEdgeRatio: envNumber(
      'MINERU_MAX_IMAGE_EDGE_RATIO',
      defaults.maxImageEdgeRatio
    ),
    cropImageFormat: envCropImageFormat(defaults.cropImageFormat),
    cropImageQuality: envNumber('MINERU_CROP_IMAGE_QUALITY', defaults.cropImageQuality),
    usePageCropCache: envBoolean(
      'MINERU_USE_PAGE_CROP_CACHE',
      defaults.usePageCropCache
    ),
    keepAlive: envBoolean('MINERU_KEEP_ALIVE', defaults.keepAlive),
    performanceLogging: envBoolean(
      'MINERU_PERFORMANCE_LOGGING',
      defaults.performanceLogging
    ),
    skipFailedPages: envBoolean('MINERU_SKIP_FAILED_PAGES', defaults.skipFailedPages),
  };
}

export function loadParseOptionsFromEnv(
  defaults: ParseFileOptions = {}
): ParseFileOptions {
  return {
    ...defaults,
    pageLimit: envInteger('MINERU_PAGE_LIMIT', defaults.pageLimit),
  };
}
