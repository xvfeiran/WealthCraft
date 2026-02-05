import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  async register(email: string, password: string, baseCurrency: string = 'CNY') {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        baseCurrency,
      },
      select: {
        id: true,
        email: true,
        baseCurrency: true,
        createdAt: true,
      },
    });

    const token = generateToken({ userId: user.id, email: user.email });
    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = generateToken({ userId: user.id, email: user.email });
    return {
      user: {
        id: user.id,
        email: user.email,
        baseCurrency: user.baseCurrency,
        notificationThreshold: user.notificationThreshold,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        baseCurrency: true,
        notificationThreshold: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async updateProfile(userId: string, data: { baseCurrency?: string; notificationThreshold?: number }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        baseCurrency: true,
        notificationThreshold: true,
      },
    });

    return user;
  }
}

export const authService = new AuthService();
