import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { getExchangeRate, convertCurrency } from '../utils/currency';
import { resolveMarketPrices } from '../utils/priceResolver';

// 子组合或直接资产的当前价值信息
interface AllocationItem {
  id: string;
  name: string;
  type: 'SUB_PORTFOLIO' | 'ASSET';
  currentValue: number;
  targetPercent: number; // allocationPercent
  assets: any[]; // 如果是子组合，包含其中的资产
}

export interface RecommendationResult {
  itemId: string;
  itemName: string;
  itemType: 'SUB_PORTFOLIO' | 'ASSET';
  assetId?: string; // 如果是资产或子组合内第一个资产
  assetSymbol?: string;
  market?: string;
  currentAllocation: number;
  targetAllocation: number;
  deviation: number;
  action: 'BUY' | 'SELL';
  suggestedValue: number;
  reason: string;
}

export class RecommendationService {
  // 卖出再平衡：不使用新资金，仅通过买卖现有资产使组合回到目标比例
  async generateSellRebalanceRecommendations(
    portfolioId: string,
    userId: string,
    deviationThreshold: number = 0.01 // 1% default threshold
  ): Promise<RecommendationResult[]> {
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

    // 只有 ALLOCATION 规则类型才能生成再平衡建议
    if (portfolio.ruleType !== 'ALLOCATION') {
      return [];
    }

    // 批量解析所有资产价格
    const priceMap = await resolveMarketPrices(portfolio.assets);

    // 计算组合总价值和各项当前价值
    const items: AllocationItem[] = [];
    let totalValue = 0;

    // 处理子组合
    for (const subPortfolio of portfolio.subPortfolios) {
      let subValue = 0;
      for (const asset of subPortfolio.assets) {
        const currentPrice = priceMap.get(asset.id) ?? asset.currentPrice;
        const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
        const assetValue = convertCurrency(asset.quantity * currentPrice, rate);
        subValue += assetValue;
      }
      totalValue += subValue;
      items.push({
        id: subPortfolio.id,
        name: subPortfolio.name,
        type: 'SUB_PORTFOLIO',
        currentValue: subValue,
        targetPercent: subPortfolio.allocationPercent / 100,
        assets: subPortfolio.assets,
      });
    }

    // 处理直接资产
    for (const asset of portfolio.assets) {
      const currentPrice = priceMap.get(asset.id) ?? asset.currentPrice;
      const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
      const assetValue = convertCurrency(asset.quantity * currentPrice, rate);
      totalValue += assetValue;
      items.push({
        id: asset.id,
        name: asset.name,
        type: 'ASSET',
        currentValue: assetValue,
        targetPercent: asset.allocationPercent / 100,
        assets: [asset],
      });
    }

    const recommendations: RecommendationResult[] = [];

    for (const item of items) {
      const currentPercent = totalValue > 0 ? item.currentValue / totalValue : 0;
      const deviation = currentPercent - item.targetPercent;

      if (Math.abs(deviation) > deviationThreshold && item.targetPercent > 0) {
        const targetValue = totalValue * item.targetPercent;
        const adjustmentValue = targetValue - item.currentValue;
        const action: 'BUY' | 'SELL' = adjustmentValue > 0 ? 'BUY' : 'SELL';

        const firstAsset = item.assets[0];
        recommendations.push({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          assetId: firstAsset?.id,
          assetSymbol: firstAsset?.symbol,
          market: firstAsset?.market,
          currentAllocation: currentPercent * 100,
          targetAllocation: item.targetPercent * 100,
          deviation: deviation * 100,
          action,
          suggestedValue: Math.abs(adjustmentValue),
          reason: `${item.name} 当前占比 ${(currentPercent * 100).toFixed(1)}%（目标: ${(item.targetPercent * 100).toFixed(1)}%）。${action === 'BUY' ? '建议买入' : '建议卖出'}以再平衡。`,
        });
      }
    }

    // Save recommendations to database
    await prisma.recommendation.deleteMany({ where: { portfolioId } });

    for (const rec of recommendations) {
      if (rec.assetId) {
        await prisma.recommendation.create({
          data: {
            portfolioId,
            assetId: rec.assetId,
            action: rec.action,
            suggestedQuantity: rec.suggestedValue,
            reason: rec.reason,
          },
        });
      }
    }

    return recommendations;
  }

  // 买入再平衡：仅使用本次投入资金，不卖出现有资产
  async generateBuyRebalanceRecommendations(
    portfolioId: string,
    userId: string,
    contributionAmount: number,
    deviationThreshold: number = 0.01
  ): Promise<RecommendationResult[]> {
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

    // 只有 ALLOCATION 规则类型才能生成再平衡建议
    if (portfolio.ruleType !== 'ALLOCATION') {
      return [];
    }

    // 批量解析所有资产价格
    const priceMap = await resolveMarketPrices(portfolio.assets);

    // 计算当前组合总价值
    const items: AllocationItem[] = [];
    let currentTotal = 0;

    for (const subPortfolio of portfolio.subPortfolios) {
      let subValue = 0;
      for (const asset of subPortfolio.assets) {
        const currentPrice = priceMap.get(asset.id) ?? asset.currentPrice;
        const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
        const assetValue = convertCurrency(asset.quantity * currentPrice, rate);
        subValue += assetValue;
      }
      currentTotal += subValue;
      items.push({
        id: subPortfolio.id,
        name: subPortfolio.name,
        type: 'SUB_PORTFOLIO',
        currentValue: subValue,
        targetPercent: subPortfolio.allocationPercent / 100,
        assets: subPortfolio.assets,
      });
    }

    for (const asset of portfolio.assets) {
      const currentPrice = priceMap.get(asset.id) ?? asset.currentPrice;
      const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
      const assetValue = convertCurrency(asset.quantity * currentPrice, rate);
      currentTotal += assetValue;
      items.push({
        id: asset.id,
        name: asset.name,
        type: 'ASSET',
        currentValue: assetValue,
        targetPercent: asset.allocationPercent / 100,
        assets: [asset],
      });
    }

    // 投入后组合总市值
    const newTotal = currentTotal + contributionAmount;

    // 计算各项的目标市值和资金缺口
    const recommendations: RecommendationResult[] = [];
    let totalGap = 0;
    const gaps: { item: AllocationItem; gap: number }[] = [];

    for (const item of items) {
      const targetValue = newTotal * item.targetPercent;
      const gap = Math.max(0, targetValue - item.currentValue);
      totalGap += gap;
      gaps.push({ item, gap });
    }

    // 按缺口比例分配投入资金
    for (const { item, gap } of gaps) {
      if (gap > 0 && totalGap > 0) {
        const allocation = (gap / totalGap) * contributionAmount;
        const currentPercent = currentTotal > 0 ? item.currentValue / currentTotal : 0;

        const firstAsset = item.assets[0];
        recommendations.push({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          assetId: firstAsset?.id,
          assetSymbol: firstAsset?.symbol,
          market: firstAsset?.market,
          currentAllocation: currentPercent * 100,
          targetAllocation: item.targetPercent * 100,
          deviation: (currentPercent - item.targetPercent) * 100,
          action: 'BUY',
          suggestedValue: Math.round(allocation * 100) / 100,
          reason: `建议买入 ${item.name} ${allocation.toFixed(2)} ${portfolio.baseCurrency} 以接近目标比例。`,
        });
      }
    }

    return recommendations;
  }

  // 兼容旧方法 - 默认使用卖出再平衡
  async generateRecommendations(
    portfolioId: string,
    userId: string,
    deviationThreshold: number = 0.05
  ): Promise<RecommendationResult[]> {
    return this.generateSellRebalanceRecommendations(portfolioId, userId, deviationThreshold);
  }

  async getRecommendations(portfolioId: string, userId: string) {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    const recommendations = await prisma.recommendation.findMany({
      where: { portfolioId },
      include: {
        asset: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return recommendations;
  }
}

export const recommendationService = new RecommendationService();
