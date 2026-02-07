import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { NFFundExtractor } from './fundDataExtractors/nffundExtractor';
import { BoseraExtractor } from './fundDataExtractors/boseraExtractor';
import { EFundsExtractor } from './fundDataExtractors/efundsExtractor';
import { FundData, SyncResults, SourceResult } from './types/fund.types';
import { FundDataValidator } from './validators/fundDataValidator';

export class FundSyncService {
  private extractors = [
    new NFFundExtractor(),
    new BoseraExtractor(),
    new EFundsExtractor(),
  ];

  // 同步所有基金公司数据
  async syncAll(): Promise<SyncResults> {
    logger.info('[FundSync] Starting sync for all fund sources...');
    const startTime = Date.now();

    const results: SyncResults = {};

    for (const extractor of this.extractors) {
      const source = extractor.getSource();
      try {
        const result = await this.syncSource(extractor);
        results[source] = result;
      } catch (error) {
        logger.error(`[FundSync] ${source} sync failed`, error);
        results[source] = {
          success: 0,
          failed: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    const duration = Date.now() - startTime;
    const totalSuccess = Object.values(results).reduce((sum, r) => sum + r.success, 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + (r.failed || 0), 0);

    logger.info(`[FundSync] All syncs completed in ${duration}ms: ${totalSuccess} success, ${totalFailed} failed`);

    return results;
  }

  // 同步单个基金公司
  async syncSource(extractor: any): Promise<SourceResult> {
    const source = extractor.getSource();
    const startTime = Date.now();

    logger.info(`[FundSync] [${source}] Starting sync...`);

    try {
      // 获取数据
      const funds = await extractor.fetch();
      logger.info(`[FundSync] [${source}] Fetched ${funds.length} funds`);

      let success = 0;
      let failed = 0;

      // 处理每只基金
      for (const fund of funds) {
        try {
          await this.upsertFund(fund);
          success++;
        } catch (error) {
          failed++;
          logger.error(`[FundSync] [${source}] Failed to upsert fund ${fund.code}`, error);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`[FundSync] [${source}] Completed in ${duration}ms: ${success} success, ${failed} failed`);

      return { source, success, failed, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[FundSync] [${source}] Failed after ${duration}ms`, error);
      throw error;
    }
  }

  // 更新或插入基金数据
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
      update: this.buildUpdateData(fund),
      create: this.buildCreateData(fund),
    });
  }

  private buildUpdateData(fund: FundData) {
    return {
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
    };
  }

  private buildCreateData(fund: FundData) {
    const updateData = this.buildUpdateData(fund);
    return {
      symbol: fund.code,
      name: fund.name,
      market: fund.market,
      type: fund.type,
      currency: 'CNY',
      ...updateData,
    };
  }

  // 获取统计信息
  async getStats(): Promise<{
    total: number;
    byMarket: Array<{ market: string; count: number }>;
  }> {
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
}
