import { Router } from 'express';
import { recommendationController } from '../controllers/recommendationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get(
  '/portfolio/:portfolioId',
  recommendationController.getRecommendations.bind(recommendationController)
);
router.post(
  '/portfolio/:portfolioId/generate',
  recommendationController.generateRecommendations.bind(recommendationController)
);

export default router;
