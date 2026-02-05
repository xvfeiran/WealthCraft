import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { PortfolioSummary, TargetAllocation } from '../types';
import { getExchangeRate, convertCurrency } from '../utils/currency';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export class PortfolioService {
  async create(
    userId: string,
    name: string,
    targetAllocation: TargetAllocation = {},
    riskLevel: RiskLevel = 'MEDIUM',
    baseCurrency: string = 'CNY'
  ) {
    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        name,
        targetAllocation: JSON.stringify(targetAllocation),
        riskLevel,
        baseCurrency,
      },
    });

    return {
      ...portfolio,
      targetAllocation: JSON.parse(portfolio.targetAllocation),
    };
  }

  async getAll(userId: string) {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      include: {
        assets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return portfolios.map((p) => ({
      ...p,
      targetAllocation: JSON.parse(p.targetAllocation),
      assetCount: p.assets.length,
    }));
  }

  async getById(portfolioId: string, userId: string) {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
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
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    return {
      ...portfolio,
      targetAllocation: JSON.parse(portfolio.targetAllocation),
    };
  }

  async update(
    portfolioId: string,
    userId: string,
    data: {
      name?: string;
      targetAllocation?: TargetAllocation;
      riskLevel?: string;
      baseCurrency?: string;
    }
  ) {
    const existing = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!existing) {
      throw new AppError('Portfolio not found', 404);
    }

    const updateData: any = { ...data };
    if (data.targetAllocation) {
      updateData.targetAllocation = JSON.stringify(data.targetAllocation);
    }

    const portfolio = await prisma.portfolio.update({
      where: { id: portfolioId },
      data: updateData,
    });

    return {
      ...portfolio,
      targetAllocation: JSON.parse(portfolio.targetAllocation),
    };
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
      include: { assets: true },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    let totalValue = 0;
    let totalCost = 0;
    const allocationMap: Record<string, number> = {};

    for (const asset of portfolio.assets) {
      const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
      const assetValue = convertCurrency(asset.quantity * asset.currentPrice, rate);
      const assetCost = convertCurrency(asset.quantity * asset.costPrice, rate);

      totalValue += assetValue;
      totalCost += assetCost;

      if (!allocationMap[asset.type]) {
        allocationMap[asset.type] = 0;
      }
      allocationMap[asset.type] += assetValue;
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
}

export const portfolioService = new PortfolioService();
