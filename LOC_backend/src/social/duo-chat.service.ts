import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DuosService } from './duos.service';

// The first load shows the latest messages; later polls only ask for what
// came from the newest one the client already has. `gte`, not `gt`: two
// messages can share a millisecond, so the client dedupes by id instead.
export const DUO_CHAT_PAGE = 50;

@Injectable()
export class DuoChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly duos: DuosService,
  ) {}

  async list(userId: string, duoId: string, after?: Date) {
    await this.duos.findForMember(duoId, userId);

    const messages = after
      ? await this.prisma.duoMessage.findMany({
          where: { duoId, createdAt: { gte: after } },
          orderBy: { createdAt: 'asc' },
          take: DUO_CHAT_PAGE,
        })
      : (
          await this.prisma.duoMessage.findMany({
            where: { duoId },
            orderBy: { createdAt: 'desc' },
            take: DUO_CHAT_PAGE,
          })
        ).reverse();

    return messages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      mine: message.senderId === userId,
    }));
  }

  async send(userId: string, duoId: string, body: string) {
    const { duo } = await this.duos.findForMember(duoId, userId);
    this.duos.assertActive(duo.endedAt);

    const message = await this.prisma.duoMessage.create({
      data: { duoId, senderId: userId, body },
    });
    // Your own message counts as read up to that point.
    await this.markRead(userId, duoId, message.createdAt);
    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      mine: true,
    };
  }

  async markRead(userId: string, duoId: string, at = new Date()) {
    const { isA } = await this.duos.findForMember(duoId, userId);
    await this.prisma.duo.update({
      where: { id: duoId },
      data: isA ? { lastReadAtA: at } : { lastReadAtB: at },
    });
  }
}
