import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './lib/prisma';
import cron from 'node-cron';
import { marketDataService } from './services/marketDataService';
import { instrumentSyncService } from './services/instrumentSyncService';

// Helper function to log sync results
function logSyncResult(result: Awaited<ReturnType<typeof instrumentSyncService.syncAll>>) {
  logger.info('Sync completed:');
  logger.info('  US Stocks:');
  logger.info(`    NASDAQ: ${result.usStock.NASDAQ.success} success, ${result.usStock.NASDAQ.failed} failed`);
  logger.info(`    NYSE: ${result.usStock.NYSE.success} success, ${result.usStock.NYSE.failed} failed`);
  logger.info(`    AMEX: ${result.usStock.AMEX.success} success, ${result.usStock.AMEX.failed} failed`);
  logger.info(`  US ETF: ${result.usETF.success} success, ${result.usETF.failed} failed`);
  logger.info('  SSE:');
  logger.info(`    Stock: ${result.sse.stock.success} success, ${result.sse.stock.failed} failed`);
  logger.info(`    Fund: ${result.sse.fund.success} success, ${result.sse.fund.failed} failed`);
  logger.info(`    Bond: ${result.sse.bond.success} success, ${result.sse.bond.failed} failed`);
  // 新增：基金同步日志
  if (result.funds) {
    logger.info('  Chinese Funds:');
    Object.entries(result.funds).forEach(([source, data]: [string, any]) => {
      logger.info(`    ${source}: ${data.success} success, ${data.failed || 0} failed`);
    });
  }
}

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected');

    // Start server
    app.listen(config.port, () => {
      logger.info(`Server running on http://localhost:${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`API documentation: http://localhost:${config.port}/api`);
    });

    // Schedule daily market instruments sync at 6:00 AM (before market open)
    cron.schedule('0 6 * * 1-5', async () => {
      logger.info('Running scheduled market instruments sync (all exchanges)...');
      try {
        const result = await instrumentSyncService.syncAll();
        logSyncResult(result);
      } catch (err) {
        logger.error('Scheduled sync failed', err);
      }
    });

    // Schedule daily price sync at 9:00 AM (market open)
    cron.schedule('0 9 * * 1-5', async () => {
      logger.info('Running scheduled price sync');
      await marketDataService.syncAllAssetPrices();
    });

    // Schedule price sync at 3:30 PM (near market close)
    cron.schedule('30 15 * * 1-5', async () => {
      logger.info('Running scheduled price sync');
      await marketDataService.syncAllAssetPrices();
    });

    logger.info('Scheduled tasks initialized');

    // Check if force sync on startup is enabled
    if (config.forceSyncOnStartup) {
      logger.info('FORCE_SYNC_ON_STARTUP is enabled, clearing all instruments and starting full sync...');
      await instrumentSyncService.clearAll();
      instrumentSyncService.syncAll()
        .then((result) => {
          logger.info('Force sync completed:');
          logSyncResult(result);
        })
        .catch((err) => {
          logger.error('Force sync failed', err);
        });
    } else {
      // Check if instruments need initial sync
      const stats = await instrumentSyncService.getStats();
      logger.info(`Current market instruments: ${stats.total} (by market: ${JSON.stringify(stats.byMarket)})`);

      // 新增：检查基金数据
      const fundStats = await instrumentSyncService.getFundStats();
      logger.info(`Current funds: ${fundStats.total} (by market: ${JSON.stringify(fundStats.byMarket)})`);

      if (stats.total === 0) {
        logger.info('No market instruments found, starting initial sync for all exchanges...');
        instrumentSyncService.syncAll()
          .then((result) => {
            logger.info('Initial sync completed:');
            logSyncResult(result);
          })
          .catch((err) => {
            logger.error('Initial sync failed', err);
          });
      } else if (fundStats.total === 0) {
        // 新增：如果交易所数据存在但基金数据为空，仅同步基金
        logger.info('No fund data found, starting initial fund sync...');
        instrumentSyncService.syncChineseFunds()
          .then((result) => {
            logger.info('Initial fund sync completed:');
            Object.entries(result).forEach(([source, data]) => {
              logger.info(`  ${source}: ${data.success} success, ${data.failed || 0} failed`);
            });
          })
          .catch((err) => {
            logger.error('Initial fund sync failed', err);
          });
      }
    }
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
