import { prisma } from '../lib/prisma';
import type { Asset } from '@prisma/client';

/**
 * 批量解析资产的市场价格。
 * 优先使用 MarketInstrument.lastPrice，无匹配时回退到 Asset.currentPrice。
 */
export async function resolveMarketPrices(assets: Asset[]): Promise<Map<string, number>> {
  if (assets.length === 0) return new Map();

  // 收集所有 symbol+market 组合，去重
  const keys = [...new Set(assets.map((a) => `${a.symbol}|${a.market}`))];
  const conditions = keys.map((k) => {
    const [symbol, market] = k.split('|');
    return { symbol, market };
  });

  // 一次查询所有匹配的 MarketInstrument
  const instruments = await prisma.marketInstrument.findMany({
    where: { OR: conditions },
    select: { symbol: true, market: true, lastPrice: true },
  });

  // 构建 lookup map: "symbol|market" → lastPrice
  const instrumentMap = new Map<string, number>();
  for (const inst of instruments) {
    if (inst.lastPrice > 0) {
      instrumentMap.set(`${inst.symbol}|${inst.market}`, inst.lastPrice);
    }
  }

  // 为每个 asset 解析价格
  const priceMap = new Map<string, number>();
  for (const asset of assets) {
    const key = `${asset.symbol}|${asset.market}`;
    priceMap.set(asset.id, instrumentMap.get(key) ?? asset.currentPrice);
  }

  return priceMap;
}

/** 解析单个资产的市场价格 */
export async function resolveMarketPrice(asset: Asset): Promise<number> {
  const instrument = await prisma.marketInstrument.findUnique({
    where: { symbol_market: { symbol: asset.symbol, market: asset.market } },
    select: { lastPrice: true },
  });

  return (instrument && instrument.lastPrice > 0) ? instrument.lastPrice : asset.currentPrice;
}
