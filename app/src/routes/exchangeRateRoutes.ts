import { Router } from 'express';
import { exchangeRateController } from '../controllers/exchangeRateController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 同步最新汇率（需要认证）
router.post('/sync', authenticate, (req, res) => exchangeRateController.sync(req, res));

// 获取最新汇率（公开接口）
router.get('/latest', (req, res) => exchangeRateController.getLatest(req, res));

// 获取汇率历史（公开接口）
router.get('/history', (req, res) => exchangeRateController.getHistory(req, res));

// 获取统计信息（公开接口）
router.get('/stats', (req, res) => exchangeRateController.getStats(req, res));

// 获取支持的货币列表（公开接口）
router.get('/currencies', (req, res) => exchangeRateController.getCurrencies(req, res));

export default router;
