import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { proxiedFetch } from '../utils/httpClient';
import { FundSyncService } from './fundSyncService';
import { binanceSyncService } from './binanceSyncService';

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

// US交易所列表
const US_EXCHANGES = ['NASDAQ', 'NYSE', 'AMEX'] as const;
type USExchange = typeof US_EXCHANGES[number];

export class InstrumentSyncService {
  private fundSyncService = new FundSyncService();

  // 新增：同步所有中国基金
  async syncChineseFunds() {
    logger.info('Starting Chinese funds sync...');
    return await this.fundSyncService.syncAll();
  }

  // 同步币安加密货币（所有USDT交易对）
  async syncBinance(): Promise<{ success: number; failed: number; total: number }> {
    logger.info('Starting Binance cryptocurrency sync...');
    return await binanceSyncService.syncUSDTMarkets();
  }

  // 同步币安前N名加密货币
  async syncBinanceTop(limit: number = 100): Promise<{ success: number; failed: number; total: number }> {
    logger.info(`Starting Binance top ${limit} cryptos sync...`);
    return await binanceSyncService.syncTopCryptos(limit);
  }

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

  // 同步美股ETF数据
  async syncUSETF(): Promise<{ success: number; failed: number }> {
    const taskId = await this.createSyncTask('US_ETF');
    let success = 0;
    let failed = 0;

    try {
      await this.updateSyncTask(taskId, 'RUNNING');

      const response = await proxiedFetch('https://api.nasdaq.com/api/screener/etf?download=true', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`US ETF API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const rows = data?.data?.data?.rows || [];

      logger.info(`Fetched ${rows.length} ETFs from US`);

      for (const etf of rows) {
        try {
          const price = parseFloat(etf.lastSalePrice?.replace('$', '') || '0');
          const changePercent = parseFloat(etf.percentageChange?.replace('%', '').replace('+', '') || '0');

          const safeChangePercent = isNaN(changePercent) ? 0 : changePercent;

          await prisma.marketInstrument.upsert({
            where: {
              symbol_market: { symbol: etf.symbol, market: 'US_ETF' },
            },
            update: {
              name: etf.companyName,
              lastPrice: price,
              changePercent: safeChangePercent,
              lastSyncAt: new Date(),
            },
            create: {
              symbol: etf.symbol,
              name: etf.companyName,
              market: 'US_ETF',
              type: 'ETF',
              currency: 'USD',
              lastPrice: price,
              changePercent: safeChangePercent,
              country: 'United States',
            },
          });
          success++;
        } catch (err) {
          failed++;
          logger.error(`Failed to sync US ETF ${etf.symbol}`, err);
        }
      }

      await this.updateSyncTask(taskId, 'SUCCESS', rows.length, success, failed);
      logger.info(`US ETF sync completed: ${success} success, ${failed} failed`);
    } catch (error: any) {
      await this.updateSyncTask(taskId, 'FAILED', 0, success, failed, error.message);
      logger.error('US ETF sync failed', error);
    }

    return { success, failed };
  }

  // 同步上交所A股数据
  async syncSSEStock(): Promise<{ success: number; failed: number }> {
    const taskId = await this.createSyncTask('SSE_STOCK');
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
        throw new Error(`SSE Stock API error: ${response.status}`);
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
      logger.info(`SSE Stock sync completed: ${success} success, ${failed} failed`);
    } catch (error: any) {
      await this.updateSyncTask(taskId, 'FAILED', 0, success, failed, error.message);
      logger.error('SSE Stock sync failed', error);
    }

    return { success, failed };
  }

  // 同步上交所基金数据
  async syncSSEFund(): Promise<{ success: number; failed: number }> {
    const taskId = await this.createSyncTask('SSE_FUND');
    let success = 0;
    let failed = 0;

    try {
      await this.updateSyncTask(taskId, 'RUNNING');

      const response = await proxiedFetch('https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/fwr', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.sse.com.cn/',
        },
      });

      if (!response.ok) {
        throw new Error(`SSE Fund API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const list: any[] = data?.list || [];

      logger.info(`Fetched ${list.length} funds from SSE`);

      for (const item of list) {
        try {
          const symbol = item[0];
          const name = item[1];
          const lastPrice = item[2] || 0;

          await prisma.marketInstrument.upsert({
            where: {
              symbol_market: { symbol, market: 'SSE_FUND' },
            },
            update: {
              name,
              lastPrice,
              lastSyncAt: new Date(),
            },
            create: {
              symbol,
              name,
              market: 'SSE_FUND',
              type: 'FUND',
              currency: 'CNY',
              lastPrice,
              country: 'China',
            },
          });
          success++;
        } catch (err) {
          failed++;
          logger.error(`Failed to sync SSE fund ${item[0]}`, err);
        }
      }

      await this.updateSyncTask(taskId, 'SUCCESS', list.length, success, failed);
      logger.info(`SSE Fund sync completed: ${success} success, ${failed} failed`);
    } catch (error: any) {
      await this.updateSyncTask(taskId, 'FAILED', 0, success, failed, error.message);
      logger.error('SSE Fund sync failed', error);
    }

    return { success, failed };
  }

  // 同步上交所债券数据
  async syncSSEBond(): Promise<{ success: number; failed: number }> {
    const taskId = await this.createSyncTask('SSE_BOND');
    let success = 0;
    let failed = 0;

    try {
      await this.updateSyncTask(taskId, 'RUNNING');

      const response = await proxiedFetch('https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/all', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.sse.com.cn/',
        },
      });

      if (!response.ok) {
        throw new Error(`SSE Bond API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const list: any[] = data?.list || [];

      // 过滤债券（代码以01开头的国债等）
      const bonds = list.filter((item: any[]) => {
        const code = item[0];
        return code.startsWith('01') || code.startsWith('02') || code.startsWith('11') || code.startsWith('12');
      });

      logger.info(`Fetched ${bonds.length} bonds from SSE (filtered from ${list.length})`);

      for (const item of bonds) {
        try {
          const symbol = item[0];
          const name = item[1];
          const lastPrice = item[2] || 0;

          await prisma.marketInstrument.upsert({
            where: {
              symbol_market: { symbol, market: 'SSE_BOND' },
            },
            update: {
              name,
              lastPrice,
              lastSyncAt: new Date(),
            },
            create: {
              symbol,
              name,
              market: 'SSE_BOND',
              type: 'BOND',
              currency: 'CNY',
              lastPrice,
              country: 'China',
            },
          });
          success++;
        } catch (err) {
          failed++;
          logger.error(`Failed to sync SSE bond ${item[0]}`, err);
        }
      }

      await this.updateSyncTask(taskId, 'SUCCESS', bonds.length, success, failed);
      logger.info(`SSE Bond sync completed: ${success} success, ${failed} failed`);
    } catch (error: any) {
      await this.updateSyncTask(taskId, 'FAILED', 0, success, failed, error.message);
      logger.error('SSE Bond sync failed', error);
    }

    return { success, failed };
  }

  // 同步所有上交所数据
  async syncAllSSE(): Promise<{
    stock: { success: number; failed: number };
    fund: { success: number; failed: number };
    bond: { success: number; failed: number };
  }> {
    const stock = await this.syncSSEStock();
    const fund = await this.syncSSEFund();
    const bond = await this.syncSSEBond();
    return { stock, fund, bond };
  }

  // 保留旧方法名兼容性
  async syncSSE(): Promise<{ success: number; failed: number }> {
    return this.syncSSEStock();
  }

  // 同步所有交易所
  async syncAll(): Promise<{
    usStock: Record<USExchange, { success: number; failed: number }>;
    usETF: { success: number; failed: number };
    sse: {
      stock: { success: number; failed: number };
      fund: { success: number; failed: number };
      bond: { success: number; failed: number };
    };
    funds: any; // 新增：基金同步结果
    binance: { success: number; failed: number; total: number }; // 新增：币安加密货币同步结果
  }> {
    logger.info('Starting full market instruments sync...');

    const usStock = await this.syncAllUS();
    const usETF = await this.syncUSETF();
    const sse = await this.syncAllSSE();

    // 新增：基金同步
    const funds = await this.syncChineseFunds();

    // 新增：币安加密货币同步
    const binance = await this.syncBinance();

    logger.info('Full market instruments sync completed');
    return { usStock, usETF, sse, funds, binance };
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

  // 新增：获取基金统计信息
  async getFundStats() {
    return await this.fundSyncService.getStats();
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
