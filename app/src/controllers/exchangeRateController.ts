import { Request, Response } from 'express';
import { exchangeRateService } from '../services/exchangeRateService';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

export class ExchangeRateController {
  /**
   * 同步最新汇率
   * POST /api/exchange-rates/sync
   */
  async sync(req: Request, res: Response) {
    try {
      const result = await exchangeRateService.syncLatestRates();
      res.json({
        success: true,
        data: result,
        message: `汇率同步完成：成功${result.success}条，失败${result.failed}条`,
      });
    } catch (error: any) {
      logger.error('[ExchangeRate] Sync failed', error);
      res.status(500).json({
        success: false,
        error: error.message || '汇率同步失败',
      });
    }
  }

  /**
   * 获取最新汇率
   * GET /api/exchange-rates/latest?from=USD&to=CNY
   */
  async getLatest(req: Request, res: Response) {
    try {
      const { from, to } = req.query;

      if (!from || !to) {
        return res.status(400).json({
          success: false,
          error: '缺少必需参数：from和to',
        });
      }

      const rate = await exchangeRateService.getLatestRate(
        from as string,
        to as string
      );

      if (rate === null) {
        return res.status(404).json({
          success: false,
          error: `未找到汇率：${from} -> ${to}`,
        });
      }

      res.json({
        success: true,
        data: {
          from,
          to,
          rate,
        },
      });
    } catch (error: any) {
      logger.error('[ExchangeRate] Get latest failed', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取汇率失败',
      });
    }
  }

  /**
   * 获取汇率历史
   * GET /api/exchange-rates/history?from=USD&to=CNY&startDate=2026-01-01&endDate=2026-02-01
   */
  async getHistory(req: Request, res: Response) {
    try {
      const { from, to, startDate, endDate } = req.query;

      if (!from || !to || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: '缺少必需参数：from, to, startDate, endDate',
        });
      }

      const history = await exchangeRateService.getRateHistory(
        from as string,
        to as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: {
          from,
          to,
          history,
          count: history.length,
        },
      });
    } catch (error: any) {
      logger.error('[ExchangeRate] Get history failed', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取汇率历史失败',
      });
    }
  }

  /**
   * 获取统计信息
   * GET /api/exchange-rates/stats
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = await exchangeRateService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('[ExchangeRate] Get stats failed', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取统计信息失败',
      });
    }
  }

  /**
   * 获取支持的货币列表
   * GET /api/exchange-rates/currencies
   */
  async getCurrencies(req: Request, res: Response) {
    try {
      const currencies = exchangeRateService.getSupportedCurrencies();

      res.json({
        success: true,
        data: {
          currencies,
          count: currencies.length,
        },
      });
    } catch (error: any) {
      logger.error('[ExchangeRate] Get currencies failed', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取货币列表失败',
      });
    }
  }
}

export const exchangeRateController = new ExchangeRateController();
