import { proxiedFetch } from '../../utils/httpClient';
import { IFundDataExtractor, FundData } from '../types/fund.types';
import { logger } from '../../utils/logger';

interface EFundsFundRaw {
  fundcode: string;
  fundname: string;
  netvalue: string;
  rzd: string; // 日涨跌幅
  fundType: string;
  tdate: string; // YYYYMMDD
  setupdate: string; // YYYY-MM-DD
  properties: {
    riskLevel: string;
  };
  managerName: string;
  qrnh: string; // 七日年化（货币基金）
  lastMonthIncome: string;
  lastYearIncome: string;
  thisYearIncome: string;
  sinceIncome: string;
  state: string;
}

export class EFundsExtractor implements IFundDataExtractor {
  async fetch(): Promise<FundData[]> {
    try {
      logger.info('[EFunds] Starting data fetch...');

      const response = await proxiedFetch(
        'https://www.efunds.com.cn/lm/jjcp/',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`EFunds API error: ${response.status}`);
      }

      const html = await response.text();

      // 提取 __FUND_SUPER_MARKET_DATA__
      const match = html.match(/var __FUND_SUPER_MARKET_DATA__\s*=\s*(\[.*?\]);/s);

      if (!match) {
        throw new Error('EFunds: Unable to extract __FUND_SUPER_MARKET_DATA__ from HTML');
      }

      const rawData: EFundsFundRaw[] = JSON.parse(match[1]);
      logger.info(`[EFunds] Extracted ${rawData.length} funds`);

      return this.transform(rawData);
    } catch (error) {
      logger.error('[EFunds] Fetch failed', error);
      throw error;
    }
  }

  private transform(rawData: EFundsFundRaw[]): FundData[] {
    return rawData.map(item => {
      const navDate = item.tdate ? this.parseDate(item.tdate) : undefined;
      const setupDate = item.setupdate ? new Date(item.setupdate) : undefined;

      return {
        code: item.fundcode,
        name: item.fundname,
        market: 'EFUNDS',
        type: 'FUND',

        lastPrice: parseFloat(item.netvalue) || 0,
        change: parseFloat(item.rzd) || 0,

        fundType: item.fundType,
        riskLevel: item.properties?.riskLevel,
        managerName: item.managerName,

        yield7d: this.safeParseFloat(item.qrnh),
        yield1m: this.safeParseFloat(item.lastMonthIncome),
        yield1y: this.safeParseFloat(item.lastYearIncome),
        yieldYtd: this.safeParseFloat(item.thisYearIncome),
        yieldSinceInception: this.safeParseFloat(item.sinceIncome),

        navDate,
        setupDate,
        isActive: item.state === '0',
      };
    });
  }

  private parseDate(str: string): Date {
    // YYYYMMDD → Date
    if (!str || str.length !== 8) return new Date();
    const year = parseInt(str.substring(0, 4));
    const month = parseInt(str.substring(4, 6)) - 1;
    const day = parseInt(str.substring(6, 8));
    return new Date(year, month, day);
  }

  private safeParseFloat(value: string): number | undefined {
    if (!value) return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  getSource(): string {
    return '易方达基金';
  }
}
