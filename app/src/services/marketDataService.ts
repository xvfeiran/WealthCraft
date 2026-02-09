import { logger } from '../utils/logger';
import { proxiedFetch } from '../utils/httpClient';
import { MarketStock } from '../types';

// US交易所列表
const US_EXCHANGES = ['NASDAQ', 'NYSE', 'AMEX'] as const;
type USExchange = typeof US_EXCHANGES[number];

export class MarketDataService {
  // Fetch stocks from specific US exchange
  async fetchUSExchangeStocks(exchange: USExchange): Promise<MarketStock[]> {
    try {
      const response = await proxiedFetch(`https://api.nasdaq.com/api/screener/stocks?download=true&exchange=${exchange}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (!response.ok) {
        throw new Error(`${exchange} API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const rows = data?.data?.rows || [];

      return rows.slice(0, 100).map((row: any) => ({
        symbol: row.symbol,
        name: row.name,
        price: parseFloat(row.lastsale?.replace('$', '') || '0'),
        change: parseFloat(row.netchange || '0'),
        changePercent: parseFloat(row.pctchange?.replace('%', '') || '0'),
        volume: parseInt(row.volume || '0'),
        marketCap: parseFloat(row.marketCap || '0'),
        currency: 'USD',
        market: exchange,
      }));
    } catch (error) {
      logger.error(`Failed to fetch ${exchange} stocks`, error);
      return [];
    }
  }

  // Fetch all US stocks from all exchanges
  async fetchAllUSStocks(): Promise<MarketStock[]> {
    const results: MarketStock[] = [];
    for (const exchange of US_EXCHANGES) {
      const stocks = await this.fetchUSExchangeStocks(exchange);
      results.push(...stocks);
    }
    return results;
  }

  // Fetch CN stocks from SSE API
  async fetchCNStocks(): Promise<MarketStock[]> {
    try {
      const response = await proxiedFetch('https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity', {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (!response.ok) {
        throw new Error(`SSE API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const list = data?.list || [];

      return list.slice(0, 100).map((item: any[]) => ({
        symbol: item[0],
        name: item[1],
        price: item[2] || 0,
        change: 0,
        changePercent: 0,
        currency: 'CNY',
        market: 'SSE' as const,
      }));
    } catch (error) {
      logger.error('Failed to fetch CN stocks', error);
      return [];
    }
  }

  // Search stocks across markets
  async searchStocks(query: string, market?: USExchange | 'SSE'): Promise<MarketStock[]> {
    const results: MarketStock[] = [];
    const searchTerm = query.toLowerCase();

    // 如果指定了美股交易所
    if (market && US_EXCHANGES.includes(market as USExchange)) {
      const stocks = await this.fetchUSExchangeStocks(market as USExchange);
      const matches = stocks.filter(
        (s) =>
          s.symbol.toLowerCase().includes(searchTerm) ||
          s.name.toLowerCase().includes(searchTerm)
      );
      results.push(...matches.slice(0, 20));
    } else if (market === 'SSE') {
      // 如果指定了上交所
      const cnStocks = await this.fetchCNStocks();
      const cnMatches = cnStocks.filter(
        (s) =>
          s.symbol.toLowerCase().includes(searchTerm) ||
          s.name.toLowerCase().includes(searchTerm)
      );
      results.push(...cnMatches.slice(0, 20));
    } else {
      // 未指定市场，搜索所有
      const usStocks = await this.fetchAllUSStocks();
      const usMatches = usStocks.filter(
        (s) =>
          s.symbol.toLowerCase().includes(searchTerm) ||
          s.name.toLowerCase().includes(searchTerm)
      );
      results.push(...usMatches.slice(0, 20));

      const cnStocks = await this.fetchCNStocks();
      const cnMatches = cnStocks.filter(
        (s) =>
          s.symbol.toLowerCase().includes(searchTerm) ||
          s.name.toLowerCase().includes(searchTerm)
      );
      results.push(...cnMatches.slice(0, 20));
    }

    return results.slice(0, 40);
  }

}

export const marketDataService = new MarketDataService();
