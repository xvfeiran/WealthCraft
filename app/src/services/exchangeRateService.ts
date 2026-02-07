import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { proxiedFetch } from '../utils/httpClient';

// 中国外汇交易中心(CFETS) API返回的原始数据结构
interface ChinamoneyRateRecord {
  vrtCode: string;
  price: string;
  vrtName: string;
  vrtEName: string;
  foreignCName: string;
}

interface ChinamoneyResponse {
  head: {
    rep_code: string;
    rep_message: string;
  };
  data: {
    lastDate: string; // 格式: "2026-02-06 9:15"
  };
  records: ChinamoneyRateRecord[];
}

// 支持的货币对（基于人民币）
export const SUPPORTED_CURRENCY_PAIRS = [
  'USD',   // 美元
  'EUR',   // 欧元
  'JPY',   // 日元
  'HKD',   // 港元
  'GBP',   // 英镑
  'AUD',   // 澳元
  'NZD',   // 新西兰元
  'SGD',   // 新加坡元
  'CHF',   // 瑞士法郎
  'CAD',   // 加元
  'MOP',   // 澳门元
  'MYR',   // 马来西亚林吉特
  'RUB',   // 俄罗斯卢布
  'ZAR',   // 南非兰特
  'KRW',   // 韩元
  'AED',   // 阿联酋迪拉姆
  'SAR',   // 沙特里亚尔
  'HUF',   // 匈牙利福林
  'PLN',   // 波兰兹罗提
  'DKK',   // 丹麦克朗
  'SEK',   // 瑞典克朗
  'NOK',   // 挪威克朗
  'TRY',   // 土耳其里拉
  'MXN',   // 墨西哥比索
  'THB',   // 泰铢
];

export class ExchangeRateService {
  /**
   * 从中国外汇交易中心同步最新汇率
   */
  async syncLatestRates(): Promise<{ success: number; failed: number }> {
    try {
      logger.info('[ExchangeRate] Starting sync from ChinaMoney...');

      const response = await proxiedFetch(
        'https://www.chinamoney.com.cn/r/cms/www/chinamoney/data/fx/ccpr.json',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`ChinaMoney API error: ${response.status}`);
      }

      const data = await response.json() as ChinamoneyResponse;

      if (data.head.rep_code !== '200') {
        throw new Error(`ChinaMoney API error: ${data.head.rep_message}`);
      }

      // 解析日期
      const dateStr = data.data.lastDate.split(' ')[0]; // "2026-02-06 9:15" -> "2026-02-06"
      const rateDate = new Date(dateStr);

      let success = 0;
      let failed = 0;

      // 处理每个货币对
      for (const record of data.records) {
        try {
          const fromCurrency = record.foreignCName;
          const toCurrency = 'CNY';
          const rate = parseFloat(record.price);

          // 特殊处理：日元是100日元/CNY
          let normalizedRate = rate;
          if (fromCurrency === 'JPY') {
            normalizedRate = rate / 100; // 转换为1日元/CNY
          }

          // 保存到数据库（使用upsert避免重复）
          await prisma.exchangeRate.upsert({
            where: {
              fromCurrency_toCurrency_date: {
                fromCurrency,
                toCurrency,
                date: rateDate,
              },
            },
            update: {
              rate: normalizedRate,
              source: 'CHINAMONEY',
            },
            create: {
              fromCurrency,
              toCurrency,
              rate: normalizedRate,
              date: rateDate,
              source: 'CHINAMONEY',
            },
          });

          success++;
        } catch (err) {
          failed++;
          logger.error(`[ExchangeRate] Failed to save rate for ${record.foreignCName}`, err);
        }
      }

      // 同时保存反向汇率（CNY -> USD = 1 / USD -> CNY）
      for (const record of data.records) {
        try {
          const fromCurrency = 'CNY';
          const toCurrency = record.foreignCName;
          const rate = parseFloat(record.price);

          // 特殊处理：日元是100日元/CNY
          let normalizedRate = rate;
          if (toCurrency === 'JPY') {
            normalizedRate = rate / 100;
          }

          // 计算反向汇率
          const reverseRate = 1 / normalizedRate;

          await prisma.exchangeRate.upsert({
            where: {
              fromCurrency_toCurrency_date: {
                fromCurrency,
                toCurrency,
                date: rateDate,
              },
            },
            update: {
              rate: reverseRate,
              source: 'CHINAMONEY',
            },
            create: {
              fromCurrency,
              toCurrency,
              rate: reverseRate,
              date: rateDate,
              source: 'CHINAMONEY',
            },
          });

          success++;
        } catch (err) {
          failed++;
          logger.error(`[ExchangeRate] Failed to save reverse rate for ${record.foreignCName}`, err);
        }
      }

      logger.info(`[ExchangeRate] Sync completed: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      logger.error('[ExchangeRate] Sync failed', error);
      throw error;
    }
  }

  /**
   * 获取最新汇率
   */
  async getLatestRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (fromCurrency === toCurrency) return 1;

    const rate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
      },
      orderBy: {
        date: 'desc',
      },
      take: 1,
    });

    return rate?.rate || null;
  }

  /**
   * 获取指定日期的汇率
   */
  async getRateForDate(fromCurrency: string, toCurrency: string, date: Date): Promise<number | null> {
    if (fromCurrency === toCurrency) return 1;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 1,
    });

    return rate?.rate || null;
  }

  /**
   * 获取汇率历史记录
   */
  async getRateHistory(
    fromCurrency: string,
    toCurrency: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; rate: number }>> {
    const records = await prisma.exchangeRate.findMany({
      where: {
        fromCurrency,
        toCurrency,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return records.map(r => ({ date: r.date, rate: r.rate }));
  }

  /**
   * 获取所有可用的货币列表
   */
  getSupportedCurrencies(): string[] {
    return SUPPORTED_CURRENCY_PAIRS;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalRecords: number;
    currencies: string[];
    latestDate: Date | null;
  }> {
    const [totalRecords, currencies, latestRecord] = await Promise.all([
      prisma.exchangeRate.count(),
      prisma.exchangeRate.findMany({
        distinct: ['fromCurrency'],
        select: { fromCurrency: true },
      }).then(records => records.map(r => r.fromCurrency)),
      prisma.exchangeRate.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true },
      }),
    ]);

    return {
      totalRecords,
      currencies,
      latestDate: latestRecord?.date || null,
    };
  }
}

export const exchangeRateService = new ExchangeRateService();
