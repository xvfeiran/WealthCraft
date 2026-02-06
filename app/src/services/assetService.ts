import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Market } from '../types';

export type DataSource = 'SYNC' | 'MANUAL';

export class AssetService {
  async getByPortfolio(portfolioId: string, userId: string) {
    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    const assets = await prisma.asset.findMany({
      where: { portfolioId },
      orderBy: { createdAt: 'desc' },
    });

    return assets.map((asset) => ({
      ...asset,
      totalValue: asset.quantity * asset.currentPrice,
      totalCost: asset.quantity * asset.costPrice,
      profitLoss: asset.quantity * (asset.currentPrice - asset.costPrice),
      profitLossPercent:
        asset.costPrice > 0 ? ((asset.currentPrice - asset.costPrice) / asset.costPrice) * 100 : 0,
    }));
  }

  async create(
    portfolioId: string,
    userId: string,
    data: {
      symbol: string;
      name: string;
      market: Market;
      subPortfolioId?: string;
      currency?: string;
      quantity?: number;
      costPrice?: number;
      currentPrice?: number;
      contributionAmount?: number;
      allocationPercent?: number;
      source?: DataSource;
    }
  ) {
    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    // 如果指定了子组合，验证子组合存在且属于该组合
    if (data.subPortfolioId) {
      const subPortfolio = await prisma.subPortfolio.findUnique({
        where: { id: data.subPortfolioId },
      });
      if (!subPortfolio || subPortfolio.portfolioId !== portfolioId) {
        throw new AppError('SubPortfolio not found or does not belong to this portfolio', 404);
      }
    }

    // Check if asset with same symbol already exists
    const existingAsset = await prisma.asset.findUnique({
      where: {
        portfolioId_symbol: { portfolioId, symbol: data.symbol },
      },
    });

    if (existingAsset) {
      throw new AppError('Asset with this symbol already exists in portfolio', 400);
    }

    const asset = await prisma.asset.create({
      data: {
        portfolioId,
        subPortfolioId: data.subPortfolioId || null,
        symbol: data.symbol,
        name: data.name,
        market: data.market,
        currency: data.currency || 'CNY',
        quantity: data.quantity || 0,
        costPrice: data.costPrice || 0,
        currentPrice: data.currentPrice || data.costPrice || 0,
        contributionAmount: data.contributionAmount || 0,
        allocationPercent: data.allocationPercent || 0,
        source: data.source || 'MANUAL',
      },
    });

    return asset;
  }

  async update(
    assetId: string,
    userId: string,
    data: {
      name?: string;
      subPortfolioId?: string | null;
      quantity?: number;
      costPrice?: number;
      currentPrice?: number;
      contributionAmount?: number;
      allocationPercent?: number;
    }
  ) {
    // Verify ownership through portfolio
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { portfolio: true },
    });

    if (!asset || asset.portfolio.userId !== userId) {
      throw new AppError('Asset not found', 404);
    }

    // 如果更新子组合ID，验证子组合存在且属于该组合
    if (data.subPortfolioId !== undefined && data.subPortfolioId !== null) {
      const subPortfolio = await prisma.subPortfolio.findUnique({
        where: { id: data.subPortfolioId },
      });
      if (!subPortfolio || subPortfolio.portfolioId !== asset.portfolioId) {
        throw new AppError('SubPortfolio not found or does not belong to this portfolio', 404);
      }
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        ...data,
        source: 'MANUAL', // Mark as manual when user updates
      },
    });

    return updatedAsset;
  }

  async delete(assetId: string, userId: string) {
    // Verify ownership through portfolio
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { portfolio: true },
    });

    if (!asset || asset.portfolio.userId !== userId) {
      throw new AppError('Asset not found', 404);
    }

    await prisma.asset.delete({ where: { id: assetId } });
    return { success: true };
  }

  async getById(assetId: string, userId: string) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        portfolio: true,
        transactions: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!asset || asset.portfolio.userId !== userId) {
      throw new AppError('Asset not found', 404);
    }

    return {
      ...asset,
      totalValue: asset.quantity * asset.currentPrice,
      totalCost: asset.quantity * asset.costPrice,
      profitLoss: asset.quantity * (asset.currentPrice - asset.costPrice),
      profitLossPercent:
        asset.costPrice > 0 ? ((asset.currentPrice - asset.costPrice) / asset.costPrice) * 100 : 0,
    };
  }

  async move(assetId: string, userId: string, targetSubPortfolioId: string | null) {
    // Verify ownership through portfolio
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { portfolio: true },
    });

    if (!asset || asset.portfolio.userId !== userId) {
      throw new AppError('Asset not found', 404);
    }

    // 如果目标是子组合，验证子组合存在且属于该组合
    if (targetSubPortfolioId !== null) {
      const subPortfolio = await prisma.subPortfolio.findUnique({
        where: { id: targetSubPortfolioId },
      });
      if (!subPortfolio || subPortfolio.portfolioId !== asset.portfolioId) {
        throw new AppError('SubPortfolio not found or does not belong to this portfolio', 404);
      }
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        subPortfolioId: targetSubPortfolioId,
        // 清除投资规则配置（因为规则是针对直接资产或子组合的）
        contributionAmount: 0,
        allocationPercent: 0,
      },
    });

    return updatedAsset;
  }

  async updatePrice(assetId: string, newPrice: number, source: string = 'SYNC') {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });

    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    // Only update if source is SYNC, skip manual assets
    if (asset.source === 'MANUAL') {
      return asset;
    }

    const oldPrice = asset.currentPrice;

    // Log the price change
    await prisma.syncLog.create({
      data: {
        assetId,
        oldPrice,
        newPrice,
        source,
      },
    });

    // Update asset price
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: { currentPrice: newPrice },
    });

    return updatedAsset;
  }
}

export const assetService = new AssetService();
