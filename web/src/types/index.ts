export interface User {
  id: string;
  email: string;
  baseCurrency: string;
  notificationThreshold: number;
  createdAt: string;
}

// 投资规则类型
export type PortfolioRuleType = 'CONTRIBUTION' | 'ALLOCATION';

// 定投周期
export type ContributionPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

// 交易所/市场
export type Market = 'SSE' | 'SSE_FUND' | 'SSE_BOND' | 'NASDAQ' | 'NYSE' | 'AMEX' | 'US_ETF';

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  baseCurrency: string;
  // 投资规则类型: CONTRIBUTION(定投) | ALLOCATION(固定比例) - 二选一
  ruleType?: PortfolioRuleType;
  // 定投周期 (仅当 ruleType = CONTRIBUTION 时使用)
  contributionPeriod?: ContributionPeriod;
  createdAt: string;
  updatedAt: string;
  subPortfolios?: SubPortfolio[];
  assets?: Asset[];
  assetCount?: number;
}

export interface SubPortfolio {
  id: string;
  portfolioId: string;
  name: string;
  // 定投金额 (仅当 portfolio.ruleType = CONTRIBUTION 时使用)
  contributionAmount: number;
  // 目标比例 (仅当 portfolio.ruleType = ALLOCATION 时使用)
  allocationPercent: number;
  createdAt: string;
  updatedAt: string;
  assets?: Asset[];
}

export interface Asset {
  id: string;
  portfolioId: string;
  subPortfolioId?: string; // 所属子组合ID，null表示直接在组合下
  symbol: string;
  name: string;
  market: Market; // 交易所
  currency: string;
  quantity: number;
  costPrice: number;
  currentPrice: number;
  // 定投金额 (仅当直接在组合下且 portfolio.ruleType = CONTRIBUTION 时使用)
  contributionAmount: number;
  // 目标比例 (仅当直接在组合下且 portfolio.ruleType = ALLOCATION 时使用)
  allocationPercent: number;
  source: 'SYNC' | 'MANUAL';
  createdAt: string;
  updatedAt: string;
  totalValue?: number;
  totalCost?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

export interface Transaction {
  id: string;
  assetId: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'FEE';
  quantity: number;
  price: number;
  fee: number;
  timestamp: string;
}

export interface Recommendation {
  id: string;
  portfolioId: string;
  assetId: string;
  action: 'BUY' | 'SELL';
  suggestedQuantity: number;
  reason: string;
  createdAt: string;
  asset?: Asset;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  returnRate: number;
  currency: string;
  assetAllocation: {
    type: string;
    value: number;
    percentage: number;
  }[];
}

export interface MarketStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  currency: string;
  market: 'NASDAQ' | 'NYSE' | 'AMEX' | 'US_ETF' | 'SSE' | 'SSE_FUND' | 'SSE_BOND';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// 投资标的 (从第三方API同步)
export interface MarketInstrument {
  id: string;
  symbol: string;
  name: string;
  market: 'SSE' | 'SSE_FUND' | 'SSE_BOND' | 'NASDAQ' | 'NYSE' | 'AMEX' | 'US_ETF';
  type: 'STOCK' | 'FUND' | 'ETF' | 'BOND';
  currency: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector?: string;
  industry?: string;
  country?: string;
  isActive: boolean;
  lastSyncAt: string;
}
