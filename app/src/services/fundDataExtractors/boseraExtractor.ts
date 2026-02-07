import { proxiedFetch } from '../../utils/httpClient';
import { IFundDataExtractor, FundData } from '../types/fund.types';
import { logger } from '../../utils/logger';

interface BoseraFundRaw {
  fundCode: string;
  fundName: string;
  netDate: string; // YYYY-MM-DD
  netValue: string;
  rate: string;
  fundTypeShow: string;
  fundRisk: string;
  weekYield: string; // 小数格式，如 ".0003"
  monthYield: string;
  threeMonthYield: string;
  halfYearYield: string;
  thisYearYield: string;
  yearYield: string;
  week: string; // 百分比格式，如 "0.03"
  month: string;
  threeMonth: string;
  year: string;
  total: string;
  fundStatus: string;
}

export class BoseraExtractor implements IFundDataExtractor {
  async fetch(): Promise<FundData[]> {
    try {
      logger.info('[Bosera] Starting data fetch...');

      const response = await proxiedFetch(
        'https://www.bosera.com/fund/index.html',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Bosera API error: ${response.status}`);
      }

      const html = await response.text();

      // 提取 window.fundListJson
      const match = html.match(/window\.fundListJson\s*=\s*(\[.*?\]);/s);

      if (!match) {
        throw new Error('Bosera: Unable to extract fundListJson from HTML');
      }

      const rawData: BoseraFundRaw[] = JSON.parse(match[1]);
      logger.info(`[Bosera] Extracted ${rawData.length} funds`);

      return this.transform(rawData);
    } catch (error) {
      logger.error('[Bosera] Fetch failed', error);
      throw error;
    }
  }

  private transform(rawData: BoseraFundRaw[]): FundData[] {
    return rawData.map(item => {
      // 处理navDate：如果是无效日期（如"--"），设为undefined
      let navDate: Date | undefined = undefined;
      if (item.netDate && item.netDate !== '--') {
        const date = new Date(item.netDate);
        if (!isNaN(date.getTime())) {
          navDate = date;
        }
      }

      // 博时基金有两套收益率数据：
      // 1. 小数格式（Yield字段）：需要乘以 100 转为百分比
      // 2. 百分比格式（直接字段）：直接使用

      return {
        code: item.fundCode,
        name: item.fundName,
        market: 'BOSERA',
        type: 'FUND',

        lastPrice: parseFloat(item.netValue) || 0,
        change: parseFloat(item.rate) || 0,

        fundType: item.fundTypeShow,
        riskLevel: item.fundRisk,

        // 使用百分比格式的数据
        yield1w: this.safeParseFloat(item.week),
        yield1m: this.safeParseFloat(item.month),
        yield3m: this.safeParseFloat(item.threeMonth),
        yield6m: this.safeParseFloat(item.halfYearYield) || this.safeParseFloat(item.year), // 博时没有6月，用1年代替
        yield1y: this.safeParseFloat(item.year),
        yieldYtd: this.safeParseFloat(item.thisYearYield),
        yieldSinceInception: this.safeParseFloat(item.total),

        navDate,
        isActive: !!(item.netValue && item.netValue !== '--'),
      };
    });
  }

  private safeParseFloat(value: string): number | undefined {
    if (!value) return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  getSource(): string {
    return '博时基金';
  }
}
