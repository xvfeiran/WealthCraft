import { Router } from 'express';
import { instrumentController } from '../controllers/instrumentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// 搜索投资标的
router.get('/search', instrumentController.search.bind(instrumentController));

// 获取统计信息
router.get('/stats', instrumentController.getStats.bind(instrumentController));

// 获取同步任务历史
router.get('/sync/tasks', instrumentController.getSyncTasks.bind(instrumentController));

// 触发全部同步
router.post('/sync', instrumentController.syncAll.bind(instrumentController));

// 触发特定交易所同步
router.post('/sync/:market', instrumentController.syncMarket.bind(instrumentController));

// 获取投资标的详情
router.get('/:market/:symbol', instrumentController.getBySymbol.bind(instrumentController));

export default router;
