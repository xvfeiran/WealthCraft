import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// API documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'Fin-Pilot API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/logout': 'Logout user (requires auth)',
        'GET /api/auth/me': 'Get current user profile (requires auth)',
        'PUT /api/auth/me': 'Update user profile (requires auth)',
      },
      portfolios: {
        'GET /api/portfolios': 'List all portfolios',
        'POST /api/portfolios': 'Create portfolio',
        'GET /api/portfolios/:id': 'Get portfolio details',
        'PUT /api/portfolios/:id': 'Update portfolio',
        'DELETE /api/portfolios/:id': 'Delete portfolio',
        'GET /api/portfolios/:id/summary': 'Get portfolio summary',
      },
      assets: {
        'GET /api/assets/search': 'Search market assets',
        'GET /api/assets/portfolio/:portfolioId': 'Get assets in portfolio',
        'POST /api/assets/portfolio/:portfolioId': 'Add asset to portfolio',
        'GET /api/assets/:id': 'Get asset details',
        'PUT /api/assets/:id': 'Update asset',
        'DELETE /api/assets/:id': 'Delete asset',
      },
      transactions: {
        'GET /api/transactions/asset/:assetId': 'Get transactions for asset',
        'POST /api/transactions/asset/:assetId': 'Record transaction',
        'DELETE /api/transactions/:id': 'Delete transaction',
      },
      recommendations: {
        'GET /api/recommendations/portfolio/:portfolioId': 'Get recommendations',
        'POST /api/recommendations/portfolio/:portfolioId/generate': 'Generate recommendations',
      },
      market: {
        'GET /api/market/stocks/us': 'Get US stocks',
        'GET /api/market/stocks/cn': 'Get CN stocks',
        'POST /api/market/sync': 'Sync asset prices',
      },
      instruments: {
        'GET /api/instruments/search?q=&market=': 'Search instruments (market: NASDAQ, SSE)',
        'GET /api/instruments/stats': 'Get instrument statistics',
        'GET /api/instruments/:market/:symbol': 'Get instrument details',
        'GET /api/instruments/sync/tasks': 'Get sync task history',
        'POST /api/instruments/sync': 'Trigger full sync (all markets)',
        'POST /api/instruments/sync/:market': 'Trigger sync for specific market',
      },
      exchangeRates: {
        'POST /api/exchange-rates/sync': 'Sync latest exchange rates from ChinaMoney',
        'GET /api/exchange-rates/latest?from=USD&to=CNY': 'Get latest exchange rate',
        'GET /api/exchange-rates/history?from=USD&to=CNY&startDate=2026-01-01&endDate=2026-02-01': 'Get exchange rate history',
        'GET /api/exchange-rates/stats': 'Get exchange rate statistics',
        'GET /api/exchange-rates/currencies': 'Get supported currencies list',
      },
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

export default app;
