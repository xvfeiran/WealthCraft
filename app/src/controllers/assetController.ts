import { Response, NextFunction } from 'express';
import { assetService } from '../services/assetService';
import { marketDataService } from '../services/marketDataService';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class AssetController {
  async getByPortfolio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { portfolioId } = req.params;
      const assets = await assetService.getByPortfolio(portfolioId, req.user.userId);

      res.json({
        success: true,
        data: assets,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { portfolioId } = req.params;
      const {
        symbol,
        name,
        market,
        subPortfolioId,
        currency,
        quantity,
        costPrice,
        currentPrice,
        startDate,
        contributionAmount,
        allocationPercent,
        source,
        channelId,
      } = req.body;

      if (!symbol || !name || !market) {
        throw new AppError('Symbol, name, and market are required', 400);
      }

      const asset = await assetService.create(portfolioId, req.user.userId, {
        symbol,
        name,
        market,
        subPortfolioId,
        currency,
        quantity,
        costPrice,
        currentPrice,
        startDate: startDate ? new Date(startDate) : undefined,
        contributionAmount,
        allocationPercent,
        source,
        channelId,
      });

      res.status(201).json({
        success: true,
        data: asset,
        message: 'Asset added',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;
      const {
        name,
        subPortfolioId,
        currency,
        quantity,
        costPrice,
        currentPrice,
        startDate,
        contributionAmount,
        allocationPercent,
        channelId,
      } = req.body;

      const asset = await assetService.update(id, req.user.userId, {
        name,
        subPortfolioId,
        currency,
        quantity,
        costPrice,
        currentPrice,
        startDate: startDate ? new Date(startDate) : undefined,
        contributionAmount,
        allocationPercent,
        channelId,
      });

      res.json({
        success: true,
        data: asset,
        message: 'Asset updated',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;
      await assetService.delete(id, req.user.userId);

      res.json({
        success: true,
        message: 'Asset deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;
      const asset = await assetService.getById(id, req.user.userId);

      res.json({
        success: true,
        data: asset,
      });
    } catch (error) {
      next(error);
    }
  }

  async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { q, market } = req.query;

      if (!q || typeof q !== 'string') {
        throw new AppError('Search query is required', 400);
      }

      const marketFilter = market as string | undefined;
      const results = await marketDataService.searchStocks(q, marketFilter as any);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async move(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;
      const { targetSubPortfolioId } = req.body;

      // targetSubPortfolioId can be null (move to direct assets) or a string (move to sub-portfolio)
      const asset = await assetService.move(
        id,
        req.user.userId,
        targetSubPortfolioId === undefined ? null : targetSubPortfolioId
      );

      res.json({
        success: true,
        data: asset,
        message: 'Asset moved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const assetController = new AssetController();
