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

// 子组合操作
router.post('/:id/sub-portfolios', portfolioController.createSubPortfolio.bind(portfolioController));
router.put('/:id/sub-portfolios/:subId', portfolioController.updateSubPortfolio.bind(portfolioController));
router.delete('/:id/sub-portfolios/:subId', portfolioController.deleteSubPortfolio.bind(portfolioController));

export default router;
