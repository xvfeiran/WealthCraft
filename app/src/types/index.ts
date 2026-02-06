import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface TargetAllocation {
  [assetType: string]: number; // e.g., { "CN_STOCK_FUND": 0.4, "US_STOCK_FUND": 0.3, "BOND": 0.2, "CRYPTO": 0.1 }
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
