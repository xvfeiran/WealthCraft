import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/asset/:assetId', transactionController.getByAsset.bind(transactionController));
router.post('/asset/:assetId', transactionController.create.bind(transactionController));
router.delete('/:id', transactionController.delete.bind(transactionController));

export default router;
