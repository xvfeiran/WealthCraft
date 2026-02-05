export interface User {
  id: string;
  email: string;
  baseCurrency: string;
  notificationThreshold: number;
  createdAt: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  targetAllocation: Record<string, number>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  baseCurrency: string;
  createdAt: string;
  updatedAt: string;
  assets?: Asset[];
  assetCount?: number;
}

export interface Asset {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string;
  type: 'CN_STOCK_FUND' | 'US_STOCK_FUND' | 'BOND' | 'CRYPTO';
  currency: string;
  quantity: number;
  costPrice: number;
  currentPrice: number;
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
  market: 'NASDAQ' | 'NYSE' | 'AMEX' | 'SSE';
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
  market: 'SSE' | 'SZSE' | 'NASDAQ' | 'NYSE' | 'AMEX';
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
