import { Router } from 'express';
import authRoutes from './auth';
import portfolioRoutes from './portfolio';
import assetRoutes from './asset';
import transactionRoutes from './transaction';
import recommendationRoutes from './recommendation';
import marketRoutes from './market';
import instrumentRoutes from './instrument';
import channelRoutes from './channel';

const router = Router();

router.use('/auth', authRoutes);
router.use('/portfolios', portfolioRoutes);
router.use('/assets', assetRoutes);
router.use('/transactions', transactionRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/market', marketRoutes);
router.use('/instruments', instrumentRoutes);
router.use('/channels', channelRoutes);

export default router;
