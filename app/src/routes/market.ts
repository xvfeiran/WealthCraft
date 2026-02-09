import { Router } from 'express';
import { marketController } from '../controllers/marketController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/stocks/us', marketController.getUSStocks.bind(marketController));
router.get('/stocks/cn', marketController.getCNStocks.bind(marketController));

export default router;
