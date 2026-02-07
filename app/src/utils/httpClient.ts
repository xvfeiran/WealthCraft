import { config } from '../config';
import { logger } from './logger';
import { ProxyAgent } from 'undici';

// Retry configuration
interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  timeoutMs: 30000,
};

// Get retry options from environment or defaults
function getRetryOptions(): RetryOptions {
  return {
    maxRetries: parseInt(process.env.HTTP_MAX_RETRIES || '3'),
    initialDelayMs: parseInt(process.env.HTTP_INITIAL_DELAY_MS || '1000'),
    maxDelayMs: parseInt(process.env.HTTP_MAX_DELAY_MS || '10000'),
    backoffMultiplier: parseFloat(process.env.HTTP_BACKOFF_MULTIPLIER || '2'),
    timeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || '30000'),
  };
}

// Cached proxy dispatcher
let proxyDispatcher: ProxyAgent | null = null;

function getProxyDispatcher(): ProxyAgent | undefined {
  if (!config.proxyUrl) {
    return undefined;
  }

  if (!proxyDispatcher) {
    proxyDispatcher = new ProxyAgent(config.proxyUrl);
  }

  return proxyDispatcher;
}

/**
 * Sleep function for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attempt: number, options: RetryOptions): number {
  const delay = Math.min(
    options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt),
    options.maxDelayMs
  );
  return delay;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Network errors (ETIMEDOUT, ECONNRESET, ECONNREFUSED, ENOTFOUND)
  if (error.code) {
    const retryableCodes = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];
    return retryableCodes.includes(error.code);
  }

  // AggregateError (contains multiple errors)
  if (error.name === 'AggregateError' && error.errors) {
    return error.errors.some((e: any) => isRetryableError(e));
  }

  // Fetch failed errors
  if (error.message && error.message.includes('fetch failed')) {
    return true;
  }

  return false;
}

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithRetry(
  url: string | URL,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const options = retryOptions || getRetryOptions();
  const dispatcher = getProxyDispatcher();

  let lastError: any;
  let timeoutId: NodeJS.Timeout | null = null;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

      const fetchInit: RequestInit = {
        ...init,
        signal: init?.signal || controller.signal,
      };

      let response: Response;

      if (dispatcher) {
        logger.debug(`Using proxy: ${config.proxyUrl}`);
        // @ts-ignore - Node.js fetch accepts dispatcher option from undici
        response = await fetch(url, {
          ...fetchInit,
          dispatcher,
        });
      } else {
        response = await fetch(url, fetchInit);
      }

      if (timeoutId) clearTimeout(timeoutId);

      // Log retry success
      if (attempt > 0) {
        logger.info(`Request succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}: ${url}`);
      }

      return response;
    } catch (error: any) {
      lastError = error;
      if (timeoutId) clearTimeout(timeoutId);

      // Check if error is retryable and we have retries left
      if (attempt < options.maxRetries && isRetryableError(error)) {
        const delay = calculateRetryDelay(attempt, options);
        logger.warn(`Request failed (attempt ${attempt + 1}/${options.maxRetries + 1}), retrying in ${delay}ms: ${url} - ${error.message || error.code}`);

        await sleep(delay);
        continue;
      }

      // Not retryable or no more retries
      break;
    }
  }

  // All retries exhausted
  logger.error(`Request failed after ${options.maxRetries + 1} attempts: ${url}`);
  throw lastError;
}

/**
 * Proxied fetch function that uses the configured proxy server when available.
 * Falls back to regular fetch when no proxy is configured.
 * Includes retry logic and timeout for network reliability.
 */
export async function proxiedFetch(
  url: string | URL,
  init?: RequestInit
): Promise<Response> {
  return fetchWithRetry(url, init);
}

/**
 * Check if proxy is configured
 */
export function isProxyConfigured(): boolean {
  return !!config.proxyUrl;
}
