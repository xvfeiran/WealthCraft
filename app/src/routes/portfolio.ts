import { Router } from 'express';
import { portfolioController } from '../controllers/portfolioController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', portfolioController.getAll.bind(portfolioController));
router.post('/', portfolioController.create.bind(portfolioController));
router.get('/:id', portfolioController.getById.bind(portfolioController));
router.put('/:id', portfolioController.update.bind(portfolioController));
router.delete('/:id', portfolioController.delete.bind(portfolioController));
router.get('/:id/summary', portfolioController.getSummary.bind(portfolioController));

export default router;
