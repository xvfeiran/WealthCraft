import { Response, NextFunction } from 'express';
import { portfolioService } from '../services/portfolioService';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class PortfolioController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { name, targetAllocation, riskLevel, baseCurrency } = req.body;

      if (!name) {
        throw new AppError('Portfolio name is required', 400);
      }

      const portfolio = await portfolioService.create(
        req.user.userId,
        name,
        targetAllocation,
        riskLevel,
        baseCurrency
      );

      res.status(201).json({
        success: true,
        data: portfolio,
        message: 'Portfolio created',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const portfolios = await portfolioService.getAll(req.user.userId);

      res.json({
        success: true,
        data: portfolios,
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
      const portfolio = await portfolioService.getById(id, req.user.userId);

      res.json({
        success: true,
        data: portfolio,
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
      const { name, targetAllocation, riskLevel, baseCurrency } = req.body;

      const portfolio = await portfolioService.update(id, req.user.userId, {
        name,
        targetAllocation,
        riskLevel,
        baseCurrency,
      });

      res.json({
        success: true,
        data: portfolio,
        message: 'Portfolio updated',
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
      await portfolioService.delete(id, req.user.userId);

      res.json({
        success: true,
        message: 'Portfolio deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;
      const summary = await portfolioService.getSummary(id, req.user.userId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const portfolioController = new PortfolioController();
