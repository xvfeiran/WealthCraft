import axios from 'axios';
import type { ApiResponse } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (email: string, password: string, baseCurrency?: string) =>
    api.post<ApiResponse>('/auth/register', { email, password, baseCurrency }),

  login: (email: string, password: string) =>
    api.post<ApiResponse>('/auth/login', { email, password }),

  logout: () => api.post<ApiResponse>('/auth/logout'),

  getProfile: () => api.get<ApiResponse>('/auth/me'),

  updateProfile: (data: { baseCurrency?: string; notificationThreshold?: number }) =>
    api.put<ApiResponse>('/auth/me', data),
};

// Portfolio API
export const portfolioApi = {
  getAll: () => api.get<ApiResponse>('/portfolios'),

  getById: (id: string) => api.get<ApiResponse>(`/portfolios/${id}`),

  create: (data: {
    name: string;
    baseCurrency?: string;
    ruleType?: 'CONTRIBUTION' | 'ALLOCATION';
    contributionPeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  }) => api.post<ApiResponse>('/portfolios', data),

  update: (id: string, data: {
    name?: string;
    baseCurrency?: string;
    ruleType?: 'CONTRIBUTION' | 'ALLOCATION';
    contributionPeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  }) => api.put<ApiResponse>(`/portfolios/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse>(`/portfolios/${id}`),

  getSummary: (id: string) => api.get<ApiResponse>(`/portfolios/${id}/summary`),

  // 子组合操作
  createSubPortfolio: (portfolioId: string, data: {
    name: string;
    contributionAmount?: number;
    allocationPercent?: number;
  }) => api.post<ApiResponse>(`/portfolios/${portfolioId}/sub-portfolios`, data),

  updateSubPortfolio: (portfolioId: string, subId: string, data: {
    name?: string;
    contributionAmount?: number;
    allocationPercent?: number;
  }) => api.put<ApiResponse>(`/portfolios/${portfolioId}/sub-portfolios/${subId}`, data),

  deleteSubPortfolio: (portfolioId: string, subId: string) =>
    api.delete<ApiResponse>(`/portfolios/${portfolioId}/sub-portfolios/${subId}`),
};

// Asset API
export const assetApi = {
  getByPortfolio: (portfolioId: string) =>
    api.get<ApiResponse>(`/assets/portfolio/${portfolioId}`),

  getById: (id: string) => api.get<ApiResponse>(`/assets/${id}`),

  create: (portfolioId: string, data: {
    symbol: string;
    name: string;
    market: string;
    subPortfolioId?: string;
    currency?: string;
    quantity?: number;
    costPrice?: number;
    currentPrice?: number;
    contributionAmount?: number;
    allocationPercent?: number;
    source?: string;
  }) => api.post<ApiResponse>(`/assets/portfolio/${portfolioId}`, data),

  update: (id: string, data: {
    name?: string;
    subPortfolioId?: string | null;
    quantity?: number;
    costPrice?: number;
    currentPrice?: number;
    contributionAmount?: number;
    allocationPercent?: number;
  }) => api.put<ApiResponse>(`/assets/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse>(`/assets/${id}`),

  move: (id: string, targetSubPortfolioId: string | null) =>
    api.post<ApiResponse>(`/assets/${id}/move`, { targetSubPortfolioId }),

  search: (query: string, market?: 'US' | 'CN') =>
    api.get<ApiResponse>('/assets/search', { params: { q: query, market } }),
};

// Transaction API
export const transactionApi = {
  getByAsset: (assetId: string, page?: number, pageSize?: number) =>
    api.get<ApiResponse>(`/transactions/asset/${assetId}`, {
      params: { page, pageSize },
    }),

  create: (assetId: string, data: {
    type: string;
    quantity: number;
    price: number;
    fee?: number;
    timestamp?: string;
    channelId?: string;
  }) => api.post<ApiResponse>(`/transactions/asset/${assetId}`, data),

  delete: (id: string) => api.delete<ApiResponse>(`/transactions/${id}`),
};

// Channel API
export const channelApi = {
  getAll: (page?: number, pageSize?: number) =>
    api.get<ApiResponse>('/channels', { params: { page, pageSize } }),

  getAllSimple: () => api.get<ApiResponse>('/channels/simple'),

  getById: (id: string) => api.get<ApiResponse>(`/channels/${id}`),

  create: (data: { name: string; currency?: string; account?: string }) =>
    api.post<ApiResponse>('/channels', data),

  update: (id: string, data: { name?: string; currency?: string; account?: string }) =>
    api.put<ApiResponse>(`/channels/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse>(`/channels/${id}`),
};

// Recommendation API
export const recommendationApi = {
  getByPortfolio: (portfolioId: string) =>
    api.get<ApiResponse>(`/recommendations/portfolio/${portfolioId}`),

  generate: (portfolioId: string, threshold?: number) =>
    api.post<ApiResponse>(`/recommendations/portfolio/${portfolioId}/generate`, null, {
      params: threshold ? { threshold } : undefined,
    }),
};

// Market API
export const marketApi = {
  getUSStocks: () => api.get<ApiResponse>('/market/stocks/us'),
  getCNStocks: () => api.get<ApiResponse>('/market/stocks/cn'),
  sync: () => api.post<ApiResponse>('/market/sync'),
};

// Instrument API (同步的投资标的)
export const instrumentApi = {
  search: (query: string, market?: string, limit?: number) =>
    api.get<ApiResponse>('/instruments/search', { params: { q: query, market, limit } }),

  getStats: () => api.get<ApiResponse>('/instruments/stats'),

  getBySymbol: (market: string, symbol: string) =>
    api.get<ApiResponse>(`/instruments/${market}/${symbol}`),

  getSyncTasks: (limit?: number) =>
    api.get<ApiResponse>('/instruments/sync/tasks', { params: { limit } }),

  syncAll: () => api.post<ApiResponse>('/instruments/sync'),

  syncMarket: (market: string) =>
    api.post<ApiResponse>(`/instruments/sync/${market}`),
};
