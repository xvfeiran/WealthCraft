import { proxiedFetch } from '../../utils/httpClient';
import { IFundDataExtractor, FundData } from '../types/fund.types';
import { logger } from '../../utils/logger';

interface NFFundRaw {
  fundcode: string;
  fundname: string;
  fdate: string; // YYYYMMDD
  nav: string;
  ljnav: string;
  upRatio: string;
  fmqwsl: string; // 万份收益
  recentOneMonth: string;
  recentThreeMonth: string;
  recentHalfYear: string;
  recentOneYear: string;
  thisYear: string;
  since: string;
  webFirstCategorys: string;
  fundManagerName: string;
  status: number;
}

export class NFFundExtractor implements IFundDataExtractor {
  async fetch(): Promise<FundData[]> {
    try {
      logger.info('[NFFund] Starting data fetch...');

      const response = await proxiedFetch(
        'https://www.nffund.com/nfwebApi/fund/supermarket',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`NFFund API error: ${response.status}`);
      }

      const result: any = await response.json();

      if (result.code !== 'ETS-5BP00000') {
        throw new Error(`NFFund API error: ${result.message}`);
      }

      // 使用g_index_allrelist获取所有基金（包括货币、债券、混合、股票等所有类型）
      const rawData: NFFundRaw[] = result.data?.g_index_allrelist || [];
      logger.info(`[NFFund] Fetched ${rawData.length} funds from g_index_allrelist`);

      return this.transform(rawData);
    } catch (error) {
      logger.error('[NFFund] Fetch failed', error);
      throw error;
    }
  }

  private transform(rawData: NFFundRaw[]): FundData[] {
    return rawData.map(item => {
      // 安全解析navDate，无效日期设为undefined
      let navDate: Date | undefined = undefined;
      if (item.fdate && item.fdate.length === 8) {
        const date = this.parseDate(item.fdate);
        if (!isNaN(date.getTime())) {
          navDate = date;
        }
      }

      // 南方基金：万份收益转七日年化（粗略计算）
      // 实际七日年化 = 万份收益 * 365 / 10000 * 100%
      const yield7d = item.fmqwsl ? (parseFloat(item.fmqwsl) * 365 / 100) : undefined;

      return {
        code: item.fundcode,
        name: item.fundname,
        market: 'NF_FUND',
        type: 'FUND',

        lastPrice: parseFloat(item.nav) || 0,
        change: parseFloat(item.upRatio) || 0,

        fundType: this.extractFundType(item.webFirstCategorys),
        managerName: item.fundManagerName || undefined,

        yield7d,
        yield1m: this.safeParseFloat(item.recentOneMonth),
        yield3m: this.safeParseFloat(item.recentThreeMonth),
        yield6m: this.safeParseFloat(item.recentHalfYear),
        yield1y: this.safeParseFloat(item.recentOneYear),
        yieldYtd: this.safeParseFloat(item.thisYear),
        yieldSinceInception: this.safeParseFloat(item.since),

        navDate,
        isActive: item.status === 1,
      };
    });
  }

  private extractFundType(categoryCode: string): string {
    // 根据南方基金分类代码映射到基金类型
    const typeMap: Record<string, string> = {
      '173C6C94CE0608f07e8d831e6f2c99d7': '混合型',
      '173C6C94CE037c8c7b796c99203456b4': '债券型',
      // TODO: 添加更多映射
    };

    return typeMap[categoryCode] || '混合型';
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
    return '南方基金';
  }
}
