import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages(bookingId: string, page = 1, limit = 50) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    const messages = await this.prisma.chatMessage.findMany({
      where: { bookingId },
      include: { sender: { select: { id: true, fullName: true, role: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return messages;
  }

  async sendMessage(bookingId: string, senderId: string, content: string, attachmentUrl?: string, messageType: any = 'TEXT') {
    return this.prisma.chatMessage.create({
      data: { bookingId, senderId, content, attachmentUrl, messageType },
      include: { sender: { select: { id: true, fullName: true, role: true, avatar: true } } },
    });
  }

  async markRead(bookingId: string, userId: string) {
    await this.prisma.chatMessage.updateMany({
      where: { bookingId, readAt: null, NOT: { senderId: userId } },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
