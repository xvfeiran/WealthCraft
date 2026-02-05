import { config } from '../config';
import { logger } from './logger';
import { ProxyAgent } from 'undici';

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
 * Proxied fetch function that uses the configured proxy server when available.
 * Falls back to regular fetch when no proxy is configured.
 */
export async function proxiedFetch(
  url: string | URL,
  init?: RequestInit
): Promise<Response> {
  const dispatcher = getProxyDispatcher();

  if (dispatcher) {
    logger.debug(`Using proxy: ${config.proxyUrl}`);
    return fetch(url, {
      ...init,
      // @ts-ignore - Node.js fetch accepts dispatcher option from undici
      dispatcher,
    });
  }

  return fetch(url, init);
}

/**
 * Check if proxy is configured
 */
export function isProxyConfigured(): boolean {
  return !!config.proxyUrl;
}
