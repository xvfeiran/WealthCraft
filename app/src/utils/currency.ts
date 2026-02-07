import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

/**
 * 获取最新汇率（从数据库中查找最近的汇率记录）
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  // 查找最新的汇率记录
  const rate = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrency: from,
      toCurrency: to,
    },
    orderBy: {
      date: 'desc',
    },
    take: 1,
  });

  if (rate) {
    return rate.rate;
  }

  // Use default rates if not found in database
  const key = `${from}_${to}` as keyof typeof config.defaultExchangeRates;
  return config.defaultExchangeRates[key] || 1;
}

export function convertCurrency(amount: number, rate: number): number {
  return amount * rate;
}

/**
 * 更新今日汇率（如果今日记录存在则更新，否则创建新记录）
 */
export async function updateExchangeRate(from: string, to: string, rate: number): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.exchangeRate.upsert({
    where: {
      fromCurrency_toCurrency_date: {
        fromCurrency: from,
        toCurrency: to,
        date: today,
      },
    },
    update: { rate },
    create: { fromCurrency: from, toCurrency: to, rate, date: today },
  });
}
