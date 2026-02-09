/**
 * Binance Sync Service
 *
 * ⚠️ TEMPORARILY DISABLED
 *
 * This service is not currently integrated into the main sync flow due to:
 * 1. Geo-blocking in China (requires proxy configuration)
 * 2. Lower priority compared to other data sources
 *
 * To enable:
 * 1. Configure PROXY_URL in app/.env file
 * 2. Import and integrate in instrumentSyncService.ts
 * 3. Add 'BINANCE' to valid markets in instrumentController.ts
 *
 * See doc/external-apis/binance-api.md for details
 *
 * TODO: Re-enable when proxy configuration is standardized or when needed
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { proxiedFetch } from '../utils/httpClient';

interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export class BinanceSyncService {
  private readonly BASE_URL = 'https://api.binance.com';

  /**
   * Sync all USDT trading pairs from Binance
   * Filters by quote volume > $10,000 to avoid low-volume coins
   */
  async syncUSDTMarkets(): Promise<{ success: number; failed: number; total: number }> {
    const taskId = await this.createSyncTask('BINANCE');
    let success = 0;
    let failed = 0;

    try {
      await this.updateSyncTask(taskId, 'RUNNING');
      logger.info('[Binance] Starting USDT markets sync...');

      // Fetch all 24hr ticker data
      const response = await proxiedFetch(`${this.BASE_URL}/api/v3/ticker/24hr`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data = (await response.json()) as BinanceTicker[];
      logger.info(`[Binance] Fetched ${data.length} trading pairs`);

      // Filter USDT pairs with sufficient volume
      const usdtPairs = data.filter((ticker) => {
        const isUSDT = ticker.symbol.endsWith('USDT');
        const isTrading = ticker.symbol !== 'USDTUSDT'; // Exclude USDT/USDT
        const minVolume = parseFloat(ticker.quoteVolume) > 10000; // Min $10,000 daily volume
        return isUSDT && isTrading && minVolume;
      });

      logger.info(`[Binance] Filtered to ${usdtPairs.length} USDT pairs with volume > $10,000`);

      // Sync each cryptocurrency
      for (const ticker of usdtPairs) {
        try {
          await this.upsertCrypto(ticker);
          success++;
        } catch (err) {
          failed++;
          logger.error(`[Binance] Failed to sync ${ticker.symbol}`, err);
        }
      }

      await this.updateSyncTask(taskId, 'SUCCESS', usdtPairs.length, success, failed);
      logger.info(`[Binance] Sync completed: ${success} success, ${failed} failed`);

      return { success, failed, total: usdtPairs.length };
    } catch (error: any) {
      await this.updateSyncTask(taskId, 'FAILED', 0, success, failed, error.message);
      logger.error('[Binance] Sync failed', error);
      throw error;
    }
  }

  /**
   * Sync top N cryptocurrencies by 24h quote volume
   */
  async syncTopCryptos(limit: number = 100): Promise<{ success: number; failed: number; total: number }> {
    const taskId = await this.createSyncTask('BINANCE_TOP');
    let success = 0;
    let failed = 0;

    try {
      await this.updateSyncTask(taskId, 'RUNNING');
      logger.info(`[Binance] Starting top ${limit} cryptos sync...`);

      const response = await proxiedFetch(`${this.BASE_URL}/api/v3/ticker/24hr`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data = (await response.json()) as BinanceTicker[];

      // Filter USDT pairs and sort by volume
      const usdtPairs = data
        .filter((t) => t.symbol.endsWith('USDT') && t.symbol !== 'USDTUSDT')
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit);

      logger.info(`[Binance] Syncing top ${usdtPairs.length} cryptos by volume`);

      for (const ticker of usdtPairs) {
        try {
          await this.upsertCrypto(ticker);
          success++;
        } catch (err) {
          failed++;
          logger.error(`[Binance] Failed to sync ${ticker.symbol}`, err);
        }
      }

      await this.updateSyncTask(taskId, 'SUCCESS', usdtPairs.length, success, failed);
      logger.info(`[Binance] Top ${limit} sync completed: ${success} success, ${failed} failed`);

      return { success, failed, total: usdtPairs.length };
    } catch (error: any) {
      await this.updateSyncTask(taskId, 'FAILED', 0, success, failed, error.message);
      logger.error('[Binance] Top cryptos sync failed', error);
      throw error;
    }
  }

  /**
   * Sync specific cryptocurrencies by symbols
   */
  async syncSpecificCryptos(symbols: string[]): Promise<{ success: number; failed: number; total: number }> {
    const taskId = await this.createSyncTask('BINANCE_SPECIFIC');
    let success = 0;
    let failed = 0;

    try {
      await this.updateSyncTask(taskId, 'RUNNING');
      logger.info(`[Binance] Syncing ${symbols.length} specific cryptos...`);

      for (const symbol of symbols) {
        try {
          const response = await proxiedFetch(
            `${this.BASE_URL}/api/v3/ticker/24hr?symbol=${symbol}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            }
          );

          if (!response.ok) {
            logger.warn(`[Binance] Failed to fetch ${symbol}: ${response.status}`);
            failed++;
            continue;
          }

          const ticker = (await response.json()) as BinanceTicker;
          await this.upsertCrypto(ticker);
          success++;
        } catch (err) {
          failed++;
          logger.error(`[Binance] Failed to sync ${symbol}`, err);
        }
      }

      await this.updateSyncTask(taskId, 'SUCCESS', symbols.length, success, failed);
      logger.info(`[Binance] Specific sync completed: ${success} success, ${failed} failed`);

      return { success, failed, total: symbols.length };
    } catch (error: any) {
      await this.updateSyncTask(taskId, 'FAILED', 0, success, failed, error.message);
      logger.error('[Binance] Specific cryptos sync failed', error);
      throw error;
    }
  }

  /**
   * Get crypto statistics from database
   */
  async getStats(): Promise<{
    total: number;
    byVolume: Array<{ symbol: string; name: string; volume: number; quoteVolume: number }>;
  }> {
    const total = await prisma.marketInstrument.count({
      where: { market: 'BINANCE', isActive: true },
    });

    const byVolume = await prisma.marketInstrument.findMany({
      where: { market: 'BINANCE', isActive: true },
      orderBy: { volume: 'desc' },
      take: 20,
      select: {
        symbol: true,
        name: true,
        volume: true,
      },
    });

    return {
      total,
      byVolume: byVolume.map((c) => ({
        ...c,
        quoteVolume: c.volume, // volume field stores quote volume for crypto
      })),
    };
  }

  /**
   * Clear all Binance cryptocurrencies
   */
  async clearAll(): Promise<number> {
    const result = await prisma.marketInstrument.deleteMany({
      where: { market: 'BINANCE' },
    });
    logger.info(`[Binance] Cleared ${result.count} cryptocurrencies`);
    return result.count;
  }

  /**
   * Upsert cryptocurrency data to database
   */
  private async upsertCrypto(ticker: BinanceTicker): Promise<void> {
    const baseAsset = ticker.symbol.replace('USDT', '');
    const price = parseFloat(ticker.lastPrice);
    const change = parseFloat(ticker.priceChange);
    const changePercent = parseFloat(ticker.priceChangePercent);
    const quoteVolume = parseFloat(ticker.quoteVolume);

    await prisma.marketInstrument.upsert({
      where: {
        symbol_market: { symbol: baseAsset, market: 'BINANCE' },
      },
      update: {
        name: this.getCryptoName(baseAsset),
        lastPrice: price,
        change,
        changePercent,
        volume: quoteVolume, // Store quote volume (USDT volume)
        marketCap: quoteVolume, // Use quote volume as proxy for market importance
        lastSyncAt: new Date(),
        isActive: true,
      },
      create: {
        symbol: baseAsset,
        name: this.getCryptoName(baseAsset),
        market: 'BINANCE',
        type: 'CRYPTO',
        currency: 'USD',
        lastPrice: price,
        change,
        changePercent,
        volume: quoteVolume,
        marketCap: quoteVolume,
        sector: 'Cryptocurrency',
        country: 'Global',
        isActive: true,
      },
    });
  }

  /**
   * Get cryptocurrency name from symbol
   * In production, this could be enhanced with a mapping or API call
   */
  private getCryptoName(symbol: string): string {
    const nameMap: Record<string, string> = {
      BTC: 'Bitcoin',
      ETH: 'Ethereum',
      BNB: 'Binance Coin',
      XRP: 'XRP',
      ADA: 'Cardano',
      SOL: 'Solana',
      DOGE: 'Dogecoin',
      DOT: 'Polkadot',
      MATIC: 'Polygon',
      LTC: 'Litecoin',
      AVAX: 'Avalanche',
      LINK: 'Chainlink',
      ATOM: 'Cosmos',
      UNI: 'Uniswap',
      TRX: 'TRON',
      XLM: 'Stellar',
      ALGO: 'Algorand',
      VET: 'VeChain',
      FIL: 'Filecoin',
      ETC: 'Ethereum Classic',
      XMR: 'Monero',
      THETA: 'Theta',
      ICP: 'Internet Computer',
      FTM: 'Fantom',
      NEAR: 'NEAR Protocol',
      APE: 'ApeCoin',
      SAND: 'The Sandbox',
      MANA: 'Decentraland',
      AXS: 'Axie Infinity',
      SHIB: 'Shiba Inu',
    };

    return nameMap[symbol] || symbol;
  }

  private async createSyncTask(market: string): Promise<string> {
    const task = await prisma.syncTask.create({
      data: {
        market,
        status: 'PENDING',
      },
    });
    return task.id;
  }

  private async updateSyncTask(
    id: string,
    status: string,
    totalCount: number = 0,
    successCount: number = 0,
    failedCount: number = 0,
    errorMessage?: string
  ) {
    await prisma.syncTask.update({
      where: { id },
      data: {
        status,
        totalCount,
        successCount,
        failedCount,
        errorMessage,
        completedAt: status === 'SUCCESS' || status === 'FAILED' ? new Date() : undefined,
      },
    });
  }
}

export const binanceSyncService = new BinanceSyncService();
