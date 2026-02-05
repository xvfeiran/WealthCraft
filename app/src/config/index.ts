import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  jwtExpiresIn: '7d',

  // HTTP Proxy for third-party API requests (optional)
  // When set, external API calls will use this proxy
  proxyUrl: process.env.PROXY_URL || '',

  // Force full sync on startup: clear all instruments and re-sync
  forceSyncOnStartup: process.env.FORCE_SYNC_ON_STARTUP === 'true',

  // Default exchange rates (updated via API in production)
  defaultExchangeRates: {
    USD_CNY: 7.2,
    CNY_USD: 0.139,
  },
};
