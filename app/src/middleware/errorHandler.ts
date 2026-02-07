import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`Error: ${err.message}`, err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Prisma error handling
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;

    // Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      // Check if it's related to User
      if (prismaError.meta?.modelName === 'Portfolio') {
        return res.status(400).json({
          success: false,
          error: 'User not found or database was reset. Please register or login first.',
        });
      }

      // Check if it's related to Channel
      if (prismaError.meta?.modelName === 'Channel') {
        return res.status(400).json({
          success: false,
          error: 'User not found. Please login first.',
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Related record not found',
      });
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Database operation failed',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
    });
  }

  // Default error
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};
