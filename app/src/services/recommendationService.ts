import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { TargetAllocation } from '../types';
import { getExchangeRate, convertCurrency } from '../utils/currency';

export interface RecommendationResult {
  assetId: string;
  assetName: string;
  assetSymbol: string;
  assetType: string;
  currentAllocation: number;
  targetAllocation: number;
  deviation: number;
  action: 'BUY' | 'SELL';
  suggestedQuantity: number;
  suggestedValue: number;
  reason: string;
}

export class RecommendationService {
  async generateRecommendations(
    portfolioId: string,
    userId: string,
    deviationThreshold: number = 0.05 // 5% default threshold
  ): Promise<RecommendationResult[]> {
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      include: { assets: true },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    const targetAllocation: TargetAllocation = JSON.parse(portfolio.targetAllocation);

    // If no target allocation set, return empty
    if (Object.keys(targetAllocation).length === 0) {
      return [];
    }

    // Calculate current portfolio value and allocation
    let totalValue = 0;
    const assetValues: Map<string, { value: number; assets: typeof portfolio.assets }> = new Map();

    for (const asset of portfolio.assets) {
      const rate = await getExchangeRate(asset.currency, portfolio.baseCurrency);
      const assetValue = convertCurrency(asset.quantity * asset.currentPrice, rate);
      totalValue += assetValue;

      if (!assetValues.has(asset.type)) {
        assetValues.set(asset.type, { value: 0, assets: [] });
      }
      const typeData = assetValues.get(asset.type)!;
      typeData.value += assetValue;
      typeData.assets.push(asset);
    }

    const recommendations: RecommendationResult[] = [];

    // Check each asset type against target
    for (const [assetType, targetPercent] of Object.entries(targetAllocation)) {
      const typeData = assetValues.get(assetType) || { value: 0, assets: [] };
      const currentPercent = totalValue > 0 ? typeData.value / totalValue : 0;
      const deviation = currentPercent - targetPercent;

      // Only generate recommendations if deviation exceeds threshold
      if (Math.abs(deviation) > deviationThreshold) {
        const targetValue = totalValue * targetPercent;
        const adjustmentValue = targetValue - typeData.value;
        const action: 'BUY' | 'SELL' = adjustmentValue > 0 ? 'BUY' : 'SELL';

        // If we have assets of this type, generate recommendation for the first one
        // In a more sophisticated system, you might distribute across multiple assets
        if (typeData.assets.length > 0) {
          const asset = typeData.assets[0];
          const suggestedQuantity = Math.abs(adjustmentValue) / asset.currentPrice;

          recommendations.push({
            assetId: asset.id,
            assetName: asset.name,
            assetSymbol: asset.symbol,
            assetType: asset.type,
            currentAllocation: currentPercent * 100,
            targetAllocation: targetPercent * 100,
            deviation: deviation * 100,
            action,
            suggestedQuantity: Math.round(suggestedQuantity * 100) / 100,
            suggestedValue: Math.abs(adjustmentValue),
            reason: `${assetType} allocation is ${(currentPercent * 100).toFixed(1)}% (target: ${(targetPercent * 100).toFixed(1)}%). ${action === 'BUY' ? 'Consider buying' : 'Consider selling'} to rebalance.`,
          });
        }
      }
    }

    // Save recommendations to database
    await prisma.recommendation.deleteMany({ where: { portfolioId } });

    for (const rec of recommendations) {
      await prisma.recommendation.create({
        data: {
          portfolioId,
          assetId: rec.assetId,
          action: rec.action,
          suggestedQuantity: rec.suggestedQuantity,
          reason: rec.reason,
        },
      });
    }

    return recommendations;
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
