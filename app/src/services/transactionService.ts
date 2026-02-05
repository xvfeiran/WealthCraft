import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'FEE';

export class TransactionService {
  async getByAsset(assetId: string, userId: string) {
    // Verify ownership through portfolio
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { portfolio: true },
    });

    if (!asset || asset.portfolio.userId !== userId) {
      throw new AppError('Asset not found', 404);
    }

    const transactions = await prisma.transaction.findMany({
      where: { assetId },
      orderBy: { timestamp: 'desc' },
    });

    return transactions;
  }

  async create(
    assetId: string,
    userId: string,
    data: {
      type: TransactionType;
      quantity: number;
      price: number;
      fee?: number;
      timestamp?: Date;
    }
  ) {
    // Verify ownership through portfolio
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { portfolio: true },
    });

    if (!asset || asset.portfolio.userId !== userId) {
      throw new AppError('Asset not found', 404);
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        assetId,
        type: data.type,
        quantity: data.quantity,
        price: data.price,
        fee: data.fee || 0,
        timestamp: data.timestamp || new Date(),
      },
    });

    // Update asset quantity and cost price based on transaction type
    let newQuantity = asset.quantity;
    let newCostPrice = asset.costPrice;

    if (data.type === 'BUY') {
      const totalOldCost = asset.quantity * asset.costPrice;
      const transactionCost = data.quantity * data.price + (data.fee || 0);
      newQuantity = asset.quantity + data.quantity;
      newCostPrice = newQuantity > 0 ? (totalOldCost + transactionCost) / newQuantity : 0;
    } else if (data.type === 'SELL') {
      newQuantity = asset.quantity - data.quantity;
      if (newQuantity < 0) {
        throw new AppError('Cannot sell more than owned quantity', 400);
      }
      // Cost price remains the same on sell
    } else if (data.type === 'DIVIDEND') {
      // Dividends can be treated as reducing cost basis
      const dividendValue = data.quantity * data.price;
      const totalCost = asset.quantity * asset.costPrice;
      newCostPrice = asset.quantity > 0 ? (totalCost - dividendValue) / asset.quantity : 0;
      if (newCostPrice < 0) newCostPrice = 0;
    }

    // Update asset
    await prisma.asset.update({
      where: { id: assetId },
      data: {
        quantity: newQuantity,
        costPrice: newCostPrice,
        currentPrice: data.type === 'BUY' || data.type === 'SELL' ? data.price : asset.currentPrice,
      },
    });

    return transaction;
  }

  async delete(transactionId: string, userId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        asset: {
          include: { portfolio: true },
        },
      },
    });

    if (!transaction || transaction.asset.portfolio.userId !== userId) {
      throw new AppError('Transaction not found', 404);
    }

    // Note: Deleting a transaction doesn't automatically reverse the asset changes
    // This is intentional - user should manually adjust asset if needed
    await prisma.transaction.delete({ where: { id: transactionId } });

    return { success: true };
  }
}

export const transactionService = new TransactionService();
