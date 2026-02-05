import { Router } from 'express';
import { assetController } from '../controllers/assetController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Search route (must be before /:id routes)
router.get('/search', assetController.search.bind(assetController));

// Asset routes
router.get('/:id', assetController.getById.bind(assetController));
router.put('/:id', assetController.update.bind(assetController));
router.delete('/:id', assetController.delete.bind(assetController));

// Portfolio asset routes (nested)
router.get('/portfolio/:portfolioId', assetController.getByPortfolio.bind(assetController));
router.post('/portfolio/:portfolioId', assetController.create.bind(assetController));

export default router;
