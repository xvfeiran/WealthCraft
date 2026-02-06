import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateChannelData {
  name: string;
  currency?: string;
  account?: string;
}

interface UpdateChannelData {
  name?: string;
  currency?: string;
  account?: string;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export const channelService = {
  // 获取用户所有渠道（分页）
  async getAll(userId: string, params: PaginationParams = {}) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const [channels, total] = await Promise.all([
      prisma.channel.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.channel.count({ where: { userId } }),
    ]);

    return {
      data: channels,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  // 获取用户所有渠道（不分页，用于下拉选择）
  async getAllSimple(userId: string) {
    return prisma.channel.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });
  },

  // 获取单个渠道
  async getById(id: string, userId: string) {
    return prisma.channel.findFirst({
      where: { id, userId },
    });
  },

  // 创建渠道
  async create(userId: string, data: CreateChannelData) {
    return prisma.channel.create({
      data: {
        userId,
        name: data.name,
        currency: data.currency || 'CNY',
        account: data.account,
      },
    });
  },

  // 更新渠道
  async update(id: string, userId: string, data: UpdateChannelData) {
    // 验证渠道属于该用户
    const channel = await prisma.channel.findFirst({
      where: { id, userId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    return prisma.channel.update({
      where: { id },
      data: {
        name: data.name,
        currency: data.currency,
        account: data.account,
      },
    });
  },

  // 删除渠道
  async delete(id: string, userId: string) {
    // 验证渠道属于该用户
    const channel = await prisma.channel.findFirst({
      where: { id, userId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    return prisma.channel.delete({
      where: { id },
    });
  },
};
