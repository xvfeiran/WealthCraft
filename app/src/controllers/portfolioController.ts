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

      const { name, baseCurrency, ruleType, contributionPeriod } = req.body;

      if (!name) {
        throw new AppError('Portfolio name is required', 400);
      }

      const portfolio = await portfolioService.create(
        req.user.userId,
        name,
        baseCurrency,
        ruleType,
        contributionPeriod
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
      const { name, baseCurrency, ruleType, contributionPeriod } = req.body;

      const portfolio = await portfolioService.update(id, req.user.userId, {
        name,
        baseCurrency,
        ruleType,
        contributionPeriod,
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

  // 子组合操作
  async createSubPortfolio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;
      const { name, contributionAmount, allocationPercent } = req.body;

      if (!name) {
        throw new AppError('SubPortfolio name is required', 400);
      }

      const subPortfolio = await portfolioService.createSubPortfolio(id, req.user.userId, {
        name,
        contributionAmount,
        allocationPercent,
      });

      res.status(201).json({
        success: true,
        data: subPortfolio,
        message: 'SubPortfolio created',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSubPortfolio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { subId } = req.params;
      const { name, contributionAmount, allocationPercent } = req.body;

      const subPortfolio = await portfolioService.updateSubPortfolio(subId, req.user.userId, {
        name,
        contributionAmount,
        allocationPercent,
      });

      res.json({
        success: true,
        data: subPortfolio,
        message: 'SubPortfolio updated',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSubPortfolio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { subId } = req.params;
      await portfolioService.deleteSubPortfolio(subId, req.user.userId);

      res.json({
        success: true,
        message: 'SubPortfolio deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubPortfolioSummaries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { id } = req.params;

      const summaries = await portfolioService.getSubPortfolioSummaries(id, req.user.userId);

      res.json({
        success: true,
        data: summaries,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const portfolioController = new PortfolioController();
