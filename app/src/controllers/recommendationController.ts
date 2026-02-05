import { Response, NextFunction } from 'express';
import { recommendationService } from '../services/recommendationService';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class RecommendationController {
  async getRecommendations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { portfolioId } = req.params;
      const recommendations = await recommendationService.getRecommendations(
        portfolioId,
        req.user.userId
      );

      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateRecommendations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { portfolioId } = req.params;
      const { threshold } = req.query;

      const deviationThreshold = threshold ? parseFloat(threshold as string) : 0.05;

      const recommendations = await recommendationService.generateRecommendations(
        portfolioId,
        req.user.userId,
        deviationThreshold
      );

      res.json({
        success: true,
        data: recommendations,
        message: `Generated ${recommendations.length} recommendations`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const recommendationController = new RecommendationController();
