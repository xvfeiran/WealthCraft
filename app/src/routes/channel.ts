import { Router } from 'express';
import { channelController } from '../controllers/channelController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有渠道路由都需要认证
router.use(authenticate);

// GET /api/channels - 获取用户所有渠道（分页）
router.get('/', channelController.getAll);

// GET /api/channels/simple - 获取用户所有渠道（简单列表）
router.get('/simple', channelController.getAllSimple);

// GET /api/channels/:id - 获取单个渠道
router.get('/:id', channelController.getById);

// POST /api/channels - 创建渠道
router.post('/', channelController.create);

// PUT /api/channels/:id - 更新渠道
router.put('/:id', channelController.update);

// DELETE /api/channels/:id - 删除渠道
router.delete('/:id', channelController.delete);

export default router;
