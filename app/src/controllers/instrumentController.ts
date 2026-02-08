import { Response, NextFunction } from 'express';
import { instrumentSyncService } from '../services/instrumentSyncService';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class InstrumentController {
  // 搜索投资标的
  async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { q, market, limit } = req.query;

      if (!q || typeof q !== 'string' || q.length < 1) {
        throw new AppError('Search query is required (min 1 character)', 400);
      }

      const instruments = await instrumentSyncService.search(
        q,
        market as string | undefined,
        limit ? parseInt(limit as string) : 50
      );

      res.json({
        success: true,
        data: instruments,
        count: instruments.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取投资标的详情
  async getBySymbol(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { symbol, market } = req.params;

      if (!symbol || !market) {
        throw new AppError('Symbol and market are required', 400);
      }

      const instrument = await instrumentSyncService.getBySymbol(symbol, market);

      if (!instrument) {
        throw new AppError('Instrument not found', 404);
      }

      res.json({
        success: true,
        data: instrument,
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取统计信息
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const stats = await instrumentSyncService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // 手动触发同步（管理功能）
  async syncAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      // 异步执行同步，立即返回
      res.json({
        success: true,
        message: 'Sync started in background',
      });

      // 在后台执行同步
      instrumentSyncService.syncAll().catch((err) => {
        console.error('Background sync failed:', err);
      });
    } catch (error) {
      next(error);
    }
  }

  // 同步特定交易所/类型
  async syncMarket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { market } = req.params;
      const validMarkets = ['NASDAQ', 'NYSE', 'AMEX', 'US_ETF', 'SSE', 'SSE_STOCK', 'SSE_FUND', 'SSE_BOND', 'BINANCE'];
      const marketUpper = market.toUpperCase();

      if (!validMarkets.includes(marketUpper)) {
        throw new AppError(`Invalid market. Supported: ${validMarkets.join(', ')}`, 400);
      }

      res.json({
        success: true,
        message: `Sync for ${marketUpper} started in background`,
      });

      // 在后台执行同步
      switch (marketUpper) {
        case 'US_ETF':
          instrumentSyncService.syncUSETF().catch(console.error);
          break;
        case 'SSE':
        case 'SSE_STOCK':
          instrumentSyncService.syncSSEStock().catch(console.error);
          break;
        case 'SSE_FUND':
          instrumentSyncService.syncSSEFund().catch(console.error);
          break;
        case 'SSE_BOND':
          instrumentSyncService.syncSSEBond().catch(console.error);
          break;
        case 'BINANCE':
          instrumentSyncService.syncBinance().catch(console.error);
          break;
        default:
          // NASDAQ, NYSE, AMEX
          instrumentSyncService.syncUSExchange(marketUpper as 'NASDAQ' | 'NYSE' | 'AMEX').catch(console.error);
      }
    } catch (error) {
      next(error);
    }
  }

  // 获取同步任务历史
  async getSyncTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { limit } = req.query;
      const tasks = await instrumentSyncService.getSyncTasks(
        limit ? parseInt(limit as string) : 20
      );

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const instrumentController = new InstrumentController();
