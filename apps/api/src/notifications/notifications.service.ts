import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    title: string,
    body: string,
    type: string,
    bookingId?: string,
    data?: Record<string, any>,
  ) {
    return this.prisma.notification.create({
      data: { userId, title, body, type, bookingId, data: data ? JSON.stringify(data) : undefined },
    });
  }

  // FIX: controller calls getUserNotifications(user.id, page) with 2 args
  // — renamed from findForUser, signature updated
  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      // FIX: field is "read" not "readAt" — matches existing DB column name
      unreadCount: notifications.filter((n) => !n.read).length,
    };
  }

  // Supports both markRead(userId) → mark all read, and markRead(userId, id) → mark one
  async markRead(userId: string, id?: string): Promise<{ count: number }> {
    const where: any = { userId };
    if (id) where.id = id;
    else where.read = null; // only unread ones

    const result = await this.prisma.notification.updateMany({
      where,
      // FIX: field is "read" (DateTime?) not "readAt" — matches schema
      data: { read: new Date() },
    });

    return { count: result.count };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      // FIX: field is "read" not "readAt"
      where: { userId, read: null },
    });
    return { count };
  }

  async deleteNotification(id: string, userId: string) {
    return this.prisma.notification.deleteMany({ where: { id, userId } });
  }
}
