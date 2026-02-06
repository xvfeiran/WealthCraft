import { Response, NextFunction } from 'express';
import { channelService } from '../services/channelService';
import { AuthRequest } from '../types';

export const channelController = {
  // 获取用户所有渠道（分页）
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;

      const result = await channelService.getAll(userId, { page, pageSize });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  // 获取用户所有渠道（简单列表，用于下拉选择）
  async getAllSimple(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const channels = await channelService.getAllSimple(userId);

      res.json({
        success: true,
        data: channels,
      });
    } catch (error) {
      next(error);
    }
  },

  // 获取单个渠道
  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const channel = await channelService.getById(id, userId);

      if (!channel) {
        return res.status(404).json({
          success: false,
          error: 'Channel not found',
        });
      }

      res.json({
        success: true,
        data: channel,
      });
    } catch (error) {
      next(error);
    }
  },

  // 创建渠道
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { name, currency, account } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Channel name is required',
        });
      }

      const channel = await channelService.create(userId, {
        name,
        currency,
        account,
      });

      res.status(201).json({
        success: true,
        data: channel,
      });
    } catch (error) {
      next(error);
    }
  },

  // 更新渠道
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { name, currency, account } = req.body;

      const channel = await channelService.update(id, userId, {
        name,
        currency,
        account,
      });

      res.json({
        success: true,
        data: channel,
      });
    } catch (error: any) {
      if (error.message === 'Channel not found') {
        return res.status(404).json({
          success: false,
          error: 'Channel not found',
        });
      }
      next(error);
    }
  },

  // 删除渠道
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await channelService.delete(id, userId);

      res.json({
        success: true,
        message: 'Channel deleted successfully',
      });
    } catch (error: any) {
      if (error.message === 'Channel not found') {
        return res.status(404).json({
          success: false,
          error: 'Channel not found',
        });
      }
      next(error);
    }
  },
};
