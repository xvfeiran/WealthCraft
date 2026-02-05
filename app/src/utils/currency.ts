import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const rate = await prisma.exchangeRate.findUnique({
    where: {
      fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to },
    },
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

export async function updateExchangeRate(from: string, to: string, rate: number): Promise<void> {
  await prisma.exchangeRate.upsert({
    where: {
      fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to },
    },
    update: { rate },
    create: { fromCurrency: from, toCurrency: to, rate },
  });
}
