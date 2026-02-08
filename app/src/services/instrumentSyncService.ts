import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { proxiedFetch } from '../utils/httpClient';
import { NFFundExtractor } from './fundDataExtractors/nffundExtractor';
import { BoseraExtractor } from './fundDataExtractors/boseraExtractor';
import { EFundsExtractor } from './fundDataExtractors/efundsExtractor';
import { FundData } from './types/fund.types';
import { FundDataValidator } from './validators/fundDataValidator';

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
  /**
   * 并行同步所有数据源
   * 所有数据源（美股交易所、上交所、基金公司）在同一抽象层，并行执行
   */
  async syncAll(): Promise<{
    usStock: Record<USExchange, { success: number; failed: number }>;
    usETF: { success: number; failed: number };
    sse: {
      stock: { success: number; failed: number };
      fund: { success: number; failed: number };
      bond: { success: number; failed: number };
    };
    funds: {
      NF_FUND: { success: number; failed: number };
      BOSERA: { success: number; failed: number };
      EFUNDS: { success: number; failed: number };
    };
  }> {
    logger.info('Starting full market instruments sync (parallel)...');

    // 并行执行所有同步任务
    const results = await Promise.all([
      this.syncAllUS(),
      this.syncUSETF(),
      this.syncAllSSE(),
      this.syncAllFunds(),
    ]);

    const [usStock, usETF, sse, funds] = results;

    logger.info('Full market instruments sync completed');
    return { usStock, usETF, sse, funds };
  }

  /**
   * 并行同步所有美股交易所
   */
  async syncAllUS(): Promise<Record<USExchange, { success: number; failed: number }>> {
    logger.info('Starting all US exchanges sync (parallel)...');

    const promises = US_EXCHANGES.map(exchange => this.syncUSExchange(exchange));
    const results = await Promise.all(promises);

    const resultRecord: Record<USExchange, { success: number; failed: number }> = {} as any;
    US_EXCHANGES.forEach((exchange, index) => {
      resultRecord[exchange] = results[index];
    });

    logger.info('All US exchanges sync completed');
    return resultRecord;
  }

  /**
   * 并行同步所有上交所数据
   */
  async syncAllSSE(): Promise<{
    stock: { success: number; failed: number };
    fund: { success: number; failed: number };
    bond: { success: number; failed: number };
  }> {
    logger.info('Starting all SSE sync (parallel)...');

    const results = await Promise.all([
      this.syncSSEStock(),
      this.syncSSEFund(),
      this.syncSSEBond(),
    ]);

    const [stock, fund, bond] = results;

    logger.info('All SSE sync completed');
    return { stock, fund, bond };
  }

  /**
   * 并行同步所有基金公司数据
   * 每个基金提取器作为独立数据源，与交易所保持同一抽象层
   */
  async syncAllFunds(): Promise<{
    NF_FUND: { success: number; failed: number };
    BOSERA: { success: number; failed: number };
    EFUNDS: { success: number; failed: number };
  }> {
    logger.info('Starting all funds sync (parallel)...');

    const promises = [
      this.syncFundSource(new NFFundExtractor()),
      this.syncFundSource(new BoseraExtractor()),
      this.syncFundSource(new EFundsExtractor()),
    ];

    const results = await Promise.all(promises);

    const funds = {
      NF_FUND: results[0],
      BOSERA: results[1],
      EFUNDS: results[2],
    };

    logger.info('All funds sync completed');
    return funds;
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

  /**
   * 同步单个基金数据源
   * 每个基金提取器作为独立数据源，与交易所保持同一抽象层
   */
  async syncFundSource(extractor: any): Promise<{ success: number; failed: number }> {
    const source = extractor.getSource();
    const taskId = await this.createSyncTask(source);
    let success = 0;
    let failed = 0;

    try {
      await this.updateSyncTask(taskId, 'RUNNING');
      logger.info(`[${source}] Starting sync...`);

      // 获取数据
      const funds = await extractor.fetch();
      logger.info(`[${source}] Fetched ${funds.length} funds`);

      // 处理每只基金
      for (const fund of funds) {
        try {
          await this.upsertFund(fund);
          success++;
        } catch (error) {
          failed++;
          logger.error(`[${source}] Failed to upsert fund ${fund.code}`, error);
        }
      }

      await this.updateSyncTask(taskId, 'SUCCESS', funds.length, success, failed);
      logger.info(`[${source}] Completed: ${success} success, ${failed} failed`);

      return { success, failed };
    } catch (error: any) {
      await this.updateSyncTask(taskId, 'FAILED', 0, success, failed, error.message);
      logger.error(`[${source}] Failed`, error);
      return { success, failed };
    }
  }

  /**
   * 更新或插入基金数据
   */
  private async upsertFund(fund: FundData): Promise<void> {
    // 数据验证
    const validation = FundDataValidator.validate(fund);
    if (!validation.valid) {
      throw new Error(`Invalid fund data: ${validation.errors.join(', ')}`);
    }

    await prisma.marketInstrument.upsert({
      where: {
        symbol_market: {
          symbol: fund.code,
          market: fund.market,
        },
      },
      update: {
        name: fund.name,
        lastPrice: fund.lastPrice,
        changePercent: fund.change,
        fundType: fund.fundType,
        riskLevel: fund.riskLevel,
        managerName: fund.managerName,
        yield7d: fund.yield7d,
        yield1w: fund.yield1w,
        yield1m: fund.yield1m,
        yield3m: fund.yield3m,
        yield6m: fund.yield6m,
        yield1y: fund.yield1y,
        yieldYtd: fund.yieldYtd,
        yieldSinceInception: fund.yieldSinceInception,
        navDate: fund.navDate,
        setupDate: fund.setupDate,
        isActive: fund.isActive,
        lastSyncAt: new Date(),
      },
      create: {
        symbol: fund.code,
        name: fund.name,
        market: fund.market,
        type: fund.type,
        currency: 'CNY',
        lastPrice: fund.lastPrice,
        changePercent: fund.change,
        fundType: fund.fundType,
        riskLevel: fund.riskLevel,
        managerName: fund.managerName,
        yield7d: fund.yield7d,
        yield1w: fund.yield1w,
        yield1m: fund.yield1m,
        yield3m: fund.yield3m,
        yield6m: fund.yield6m,
        yield1y: fund.yield1y,
        yieldYtd: fund.yieldYtd,
        yieldSinceInception: fund.yieldSinceInception,
        navDate: fund.navDate,
        setupDate: fund.setupDate,
        isActive: fund.isActive,
      },
    });
  }

  // 保留旧方法名兼容性
  async syncSSE(): Promise<{ success: number; failed: number }> {
    return this.syncSSEStock();
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

  // 获取基金统计信息
  async getFundStats() {
    const markets = ['NF_FUND', 'BOSERA', 'EFUNDS'];

    const counts = await Promise.all(
      markets.map(async (market) => ({
        market,
        count: await prisma.marketInstrument.count({
          where: { market },
        }),
      }))
    );

    const total = counts.reduce((sum, item) => sum + item.count, 0);

    return {
      total,
      byMarket: counts.filter(item => item.count > 0),
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
