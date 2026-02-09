import { Response, NextFunction } from 'express';
import { marketDataService } from '../services/marketDataService';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class MarketController {
  async getUSStocks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const stocks = await marketDataService.fetchAllUSStocks();

      res.json({
        success: true,
        data: stocks,
        count: stocks.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCNStocks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const stocks = await marketDataService.fetchCNStocks();

      res.json({
        success: true,
        data: stocks,
        count: stocks.length,
      });
    } catch (error) {
      next(error);
    }
  }

}

export const marketController = new MarketController();
