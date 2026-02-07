import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { PortfolioSummary, PortfolioRuleType, ContributionPeriod } from '../types';
import { getExchangeRate, convertCurrency } from '../utils/currency';
import type { SubPortfolio as PrismaSubPortfolio, Asset as PrismaAsset } from '@prisma/client';

export class PortfolioService {
  async create(
    userId: string,
    name: string,
    baseCurrency: string = 'CNY',
    ruleType?: PortfolioRuleType,
    contributionPeriod?: ContributionPeriod
  ) {
    // 验证规则类型：如果设置了定投周期，则规则类型必须为CONTRIBUTION
    if (contributionPeriod && ruleType !== 'CONTRIBUTION') {
      throw new AppError('Contribution period requires CONTRIBUTION rule type', 400);
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        name,
        baseCurrency,
        ruleType,
        contributionPeriod,
      },
    });

    return portfolio;
  }

  async getAll(userId: string) {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      include: {
        subPortfolios: {
          include: { assets: true },
        },
        assets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return portfolios.map((p) => {
      // p.assets includes ALL assets (both direct and in sub-portfolios)
      // So we just count p.assets.length, not add subPortfolio assets again
      return {
        ...p,
        assetCount: p.assets.length,
      };
    });
  }

  async getById(portfolioId: string, userId: string) {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      include: {
        subPortfolios: {
          include: {
            assets: {
              include: {
                transactions: {
                  orderBy: { timestamp: 'desc' },
                  take: 5,
                },
              },
            },
          },
        },
        assets: {
          include: {
            transactions: {
              orderBy: { timestamp: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    return portfolio;
  }

  async update(
    portfolioId: string,
    userId: string,
    data: {
      name?: string;
      baseCurrency?: string;
      ruleType?: PortfolioRuleType;
      contributionPeriod?: ContributionPeriod;
    }
  ) {
    const existing = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!existing) {
      throw new AppError('Portfolio not found', 404);
    }

    // 验证规则类型：如果设置了定投周期，则规则类型必须为CONTRIBUTION
    if (data.contributionPeriod && data.ruleType !== 'CONTRIBUTION') {
      throw new AppError('Contribution period requires CONTRIBUTION rule type', 400);
    }

    const portfolio = await prisma.portfolio.update({
      where: { id: portfolioId },
      data,
    });

    return portfolio;
  }

  async delete(portfolioId: string, userId: string) {
    const existing = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!existing) {
      throw new AppError('Portfolio not found', 404);
    }

    await prisma.portfolio.delete({ where: { id: portfolioId } });
    return { success: true };
  }

  async getSummary(portfolioId: string, userId: string): Promise<PortfolioSummary> {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      include: {
        assets: true,
      },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    let totalValue = 0;
    let totalCost = 0;
    const allocationMap: Record<string, number> = {};

    // 计算所有资产（包括直接资产和子组合内的资产）
    // portfolio.assets 已经包含了所有关联的资产
    for (const asset of portfolio.assets) {
      const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
      const assetValue = convertCurrency(asset.quantity * asset.currentPrice, rate);
      const assetCost = convertCurrency(asset.quantity * asset.costPrice, rate);

      totalValue += assetValue;
      totalCost += assetCost;

      if (!allocationMap[asset.market]) {
        allocationMap[asset.market] = 0;
      }
      allocationMap[asset.market] += assetValue;
    }

    const assetAllocation = Object.entries(allocationMap).map(([type, value]) => ({
      type,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));

    return {
      totalValue,
      totalCost,
      totalReturn: totalValue - totalCost,
      returnRate: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      currency: portfolio.baseCurrency,
      assetAllocation,
    };
  }

  // 获取所有子组合的汇总信息
  async getSubPortfolioSummaries(portfolioId: string, userId: string): Promise<
    Array<{
      subPortfolio: PrismaSubPortfolio & { assets: PrismaAsset[] };
      summary: PortfolioSummary;
      currentPercent: number; // 当前占比
      deviation: number; // 偏离预期占比（百分点）
    }>
  > {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      include: {
        subPortfolios: {
          include: { assets: true },
        },
        assets: true,
      },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    // 计算组合总价值（用于计算占比）
    let totalValue = 0;
    for (const asset of portfolio.assets) {
      const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
      const assetValue = convertCurrency(asset.quantity * asset.currentPrice, rate);
      totalValue += assetValue;
    }

    const results = [];

    // 计算每个子组合的summary
    for (const subPortfolio of portfolio.subPortfolios) {
      let spTotalValue = 0;
      let spTotalCost = 0;

      for (const asset of subPortfolio.assets) {
        const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
        const assetValue = convertCurrency(asset.quantity * asset.currentPrice, rate);
        const assetCost = convertCurrency(asset.quantity * asset.costPrice, rate);

        spTotalValue += assetValue;
        spTotalCost += assetCost;
      }

      // 计算当前占比
      const currentPercent = totalValue > 0 ? (spTotalValue / totalValue) * 100 : 0;

      // 计算偏离预期占比
      const targetPercent = subPortfolio.allocationPercent || 0;
      const deviation = currentPercent - targetPercent;

      results.push({
        subPortfolio,
        summary: {
          totalValue: spTotalValue,
          totalCost: spTotalCost,
          totalReturn: spTotalValue - spTotalCost,
          returnRate: spTotalCost > 0 ? ((spTotalValue - spTotalCost) / spTotalCost) * 100 : 0,
          currency: portfolio.baseCurrency,
          assetAllocation: [],
        },
        currentPercent,
        deviation,
      });
    }

    return results;
  }

  // 创建子组合
  async createSubPortfolio(
    portfolioId: string,
    userId: string,
    data: {
      name: string;
      contributionAmount?: number;
      allocationPercent?: number;
    }
  ) {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    const subPortfolio = await prisma.subPortfolio.create({
      data: {
        portfolioId,
        name: data.name,
        contributionAmount: data.contributionAmount || 0,
        allocationPercent: data.allocationPercent || 0,
      },
    });

    return subPortfolio;
  }

  // 更新子组合
  async updateSubPortfolio(
    subPortfolioId: string,
    userId: string,
    data: {
      name?: string;
      contributionAmount?: number;
      allocationPercent?: number;
    }
  ) {
    const subPortfolio = await prisma.subPortfolio.findUnique({
      where: { id: subPortfolioId },
      include: { portfolio: true },
    });

    if (!subPortfolio || subPortfolio.portfolio.userId !== userId) {
      throw new AppError('SubPortfolio not found', 404);
    }

    const updated = await prisma.subPortfolio.update({
      where: { id: subPortfolioId },
      data,
    });

    return updated;
  }

  // 删除子组合
  async deleteSubPortfolio(subPortfolioId: string, userId: string) {
    const subPortfolio = await prisma.subPortfolio.findUnique({
      where: { id: subPortfolioId },
      include: { portfolio: true },
    });

    if (!subPortfolio || subPortfolio.portfolio.userId !== userId) {
      throw new AppError('SubPortfolio not found', 404);
    }

    await prisma.subPortfolio.delete({ where: { id: subPortfolioId } });
    return { success: true };
  }

  // 获取收益曲线数据
  async getProfitCurve(portfolioId: string, userId: string): Promise<
    Array<{ date: string; value: number; cost: number; profit: number; profitRate: number }>
  > {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      include: {
        assets: true,
      },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    // 获取所有资产的开始日期，并按日期排序
    const assetDates: Array<{ date: Date; asset: typeof portfolio.assets[0] }> = [];
    for (const asset of portfolio.assets) {
      const startDate = new Date(asset.startDate || asset.createdAt);
      startDate.setHours(0, 0, 0, 0);
      assetDates.push({ date: startDate, asset });
    }
    assetDates.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (assetDates.length === 0) {
      return [];
    }

    // 为每个资产添加日期生成一个数据点，以及今天的数据点
    const curveData: Array<{ date: string; value: number; cost: number; profit: number; profitRate: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cumulativeValue = 0;
    let cumulativeCost = 0;

    // 使用Set来去重，避免同一天有多个数据点
    const processedDates = new Set<string>();

    for (const item of assetDates) {
      const dateStr = item.date.toISOString().split('T')[0];

      if (!processedDates.has(dateStr)) {
        const rate = await getExchangeRate(item.asset.currency, portfolio.baseCurrency);
        const assetValue = convertCurrency(item.asset.quantity * item.asset.currentPrice, rate);
        const assetCost = convertCurrency(item.asset.quantity * item.asset.costPrice, rate);

        cumulativeValue += assetValue;
        cumulativeCost += assetCost;

        curveData.push({
          date: dateStr,
          value: cumulativeValue,
          cost: cumulativeCost,
          profit: cumulativeValue - cumulativeCost,
          profitRate: cumulativeCost > 0 ? ((cumulativeValue - cumulativeCost) / cumulativeCost) * 100 : 0,
        });

        processedDates.add(dateStr);
      }
    }

    // 添加今天的数据点（如果还没有）
    const todayStr = today.toISOString().split('T')[0];
    if (!processedDates.has(todayStr)) {
      // 重新计算当前总值
      let totalValue = 0;
      let totalCost = 0;
      for (const asset of portfolio.assets) {
        const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
        const assetValue = convertCurrency(asset.quantity * asset.currentPrice, rate);
        const assetCost = convertCurrency(asset.quantity * asset.costPrice, rate);
        totalValue += assetValue;
        totalCost += assetCost;
      }

      curveData.push({
        date: todayStr,
        value: totalValue,
        cost: totalCost,
        profit: totalValue - totalCost,
        profitRate: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      });
    }

    // 按日期排序
    curveData.sort((a, b) => a.date.localeCompare(b.date));

    return curveData;
  }
}

export const portfolioService = new PortfolioService();
