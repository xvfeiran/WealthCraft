import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { proxiedFetch } from '../utils/httpClient';

interface NASDAQStock {
  symbol: string;
  name: string;
  lastsale: string;
  netchange: string;
  pctchange: string;
  volume: string;
  marketCap: string;
  country: string;
  sector: string;
  industry: string;
}

interface SSEStock {
  code: string;
  name: string;
  lastPrice: number;
}

// US交易所列表
const US_EXCHANGES = ['NASDAQ', 'NYSE', 'AMEX'] as const;
type USExchange = typeof US_EXCHANGES[number];

export class InstrumentSyncService {
  // 同步单个美股交易所数据
  async syncUSExchange(exchange: USExchange): Promise<{ success: number; failed: number }> {
    const taskId = await this.createSyncTask(exchange);
    let success = 0;
    let failed = 0;

    try {
      await this.updateSyncTask(taskId, 'RUNNING');

      const response = await proxiedFetch(`https://api.nasdaq.com/api/screener/stocks?download=true&exchange=${exchange}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`${exchange} API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const rows: NASDAQStock[] = data?.data?.rows || [];

      logger.info(`Fetched ${rows.length} stocks from ${exchange}`);

      for (const stock of rows) {
        try {
          const price = parseFloat(stock.lastsale?.replace('$', '') || '0');
          const change = parseFloat(stock.netchange || '0');
          const changePercent = parseFloat(stock.pctchange?.replace('%', '') || '0');
          const volume = parseFloat(stock.volume || '0');
          const marketCap = parseFloat(stock.marketCap || '0');

          await prisma.marketInstrument.upsert({
            where: {
              symbol_market: { symbol: stock.symbol, market: exchange },
            },
            update: {
              name: stock.name,
              lastPrice: price,
              change,
              changePercent,
              volume,
              marketCap,
              sector: stock.sector || null,
              industry: stock.industry || null,
              country: stock.country || null,
              lastSyncAt: new Date(),
            },
            create: {
              symbol: stock.symbol,
              name: stock.name,
              market: exchange,
              type: 'STOCK',
              currency: 'USD',
              lastPrice: price,
              change,
              changePercent,
              volume,
              marketCap,
              sector: stock.sector || null,
              industry: stock.industry || null,
              country: stock.country || null,
            },
          });
          success++;
        } catch (err) {
          failed++;
          logger.error(`Failed to sync ${exchange} stock ${stock.symbol}`, err);
        }
      }

      await this.updateSyncTask(taskId, 'SUCCESS', rows.length, success, failed);
      logger.info(`${exchange} sync completed: ${success} success, ${failed} failed`);
    } catch (error: any) {
      await this.updateSyncTask(taskId, 'FAILED', 0, success, failed, error.message);
      logger.error(`${exchange} sync failed`, error);
    }

    return { success, failed };
  }

  // 同步所有美股交易所
  async syncAllUS(): Promise<Record<USExchange, { success: number; failed: number }>> {
    const results = {} as Record<USExchange, { success: number; failed: number }>;
    for (const exchange of US_EXCHANGES) {
      results[exchange] = await this.syncUSExchange(exchange);
    }
    return results;
  }

  // 同步上交所A股数据
  async syncSSE(): Promise<{ success: number; failed: number }> {
    const taskId = await this.createSyncTask('SSE');
    let success = 0;
    let failed = 0;

    try {
      await this.updateSyncTask(taskId, 'RUNNING');

      const response = await proxiedFetch('https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.sse.com.cn/',
        },
      });

      if (!response.ok) {
        throw new Error(`SSE API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const list: any[] = data?.list || [];

      logger.info(`Fetched ${list.length} stocks from SSE`);

      for (const item of list) {
        try {
          const symbol = item[0];
          const name = item[1];
          const lastPrice = item[2] || 0;

          await prisma.marketInstrument.upsert({
            where: {
              symbol_market: { symbol, market: 'SSE' },
            },
            update: {
              name,
              lastPrice,
              lastSyncAt: new Date(),
            },
            create: {
              symbol,
              name,
              market: 'SSE',
              type: 'STOCK',
              currency: 'CNY',
              lastPrice,
              country: 'China',
            },
          });
          success++;
        } catch (err) {
          failed++;
          logger.error(`Failed to sync SSE stock ${item[0]}`, err);
        }
      }

      await this.updateSyncTask(taskId, 'SUCCESS', list.length, success, failed);
      logger.info(`SSE sync completed: ${success} success, ${failed} failed`);
    } catch (error: any) {
      await this.updateSyncTask(taskId, 'FAILED', 0, success, failed, error.message);
      logger.error('SSE sync failed', error);
    }

    return { success, failed };
  }

  // 同步所有交易所
  async syncAll(): Promise<{
    us: Record<USExchange, { success: number; failed: number }>;
    sse: { success: number; failed: number };
  }> {
    logger.info('Starting full market instruments sync...');

    const us = await this.syncAllUS();
    const sse = await this.syncSSE();

    logger.info('Full market instruments sync completed');
    return { us, sse };
  }

  // 搜索投资标的
  async search(query: string, market?: string, limit: number = 50) {
    const where: any = {
      OR: [
        { symbol: { contains: query.toUpperCase() } },
        { name: { contains: query } },
      ],
      isActive: true,
    };

    if (market) {
      where.market = market;
    }

    const instruments = await prisma.marketInstrument.findMany({
      where,
      take: limit,
      orderBy: [
        { marketCap: 'desc' },
        { symbol: 'asc' },
      ],
    });

    return instruments;
  }

  // 获取投资标的详情
  async getBySymbol(symbol: string, market: string) {
    return prisma.marketInstrument.findUnique({
      where: {
        symbol_market: { symbol, market },
      },
    });
  }

  // 获取同步任务列表
  async getSyncTasks(limit: number = 20) {
    return prisma.syncTask.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  // 获取统计信息
  async getStats() {
    const [total, byMarket] = await Promise.all([
      prisma.marketInstrument.count({ where: { isActive: true } }),
      prisma.marketInstrument.groupBy({
        by: ['market'],
        _count: { id: true },
        where: { isActive: true },
      }),
    ]);

    return {
      total,
      byMarket: byMarket.map((m) => ({ market: m.market, count: m._count.id })),
    };
  }

  // 清空所有投资标的数据
  async clearAll(): Promise<number> {
    const result = await prisma.marketInstrument.deleteMany({});
    logger.info(`Cleared ${result.count} market instruments`);
    return result.count;
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

export const instrumentSyncService = new InstrumentSyncService();
