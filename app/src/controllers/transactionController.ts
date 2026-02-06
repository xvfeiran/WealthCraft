import { Response, NextFunction } from 'express';
import { transactionService } from '../services/transactionService';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class TransactionController {
  async getByAsset(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }

      const { assetId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;

      const result = await transactionService.getByAsset(assetId, req.user.userId, {
        page,
        pageSize,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
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

      const { assetId } = req.params;
      const { type, quantity, price, fee, timestamp, channelId } = req.body;

      if (!type || quantity === undefined || price === undefined) {
        throw new AppError('Type, quantity, and price are required', 400);
      }

      if (!['BUY', 'SELL', 'DIVIDEND', 'FEE'].includes(type)) {
        throw new AppError('Invalid transaction type', 400);
      }

      const transaction = await transactionService.create(assetId, req.user.userId, {
        type,
        quantity,
        price,
        fee,
        timestamp: timestamp ? new Date(timestamp) : undefined,
        channelId,
      });

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Transaction recorded',
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
      await transactionService.delete(id, req.user.userId);

      res.json({
        success: true,
        message: 'Transaction deleted',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const transactionController = new TransactionController();
