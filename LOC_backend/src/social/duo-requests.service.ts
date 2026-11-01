import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canDuo, type DuoQueue } from '../common/duo-eligibility';
import { PrismaService } from '../prisma/prisma.service';
import { DUO_ACCOUNT_SELECT, rankForQueue, toAccountCard } from './duo-cards';
import type { CreateDuoRequestInput } from './social.schemas';

// Keeps one player from spraying requests at everyone in the list.
export const MAX_PENDING_SENT_REQUESTS = 10;

const REQUEST_INCLUDE = {
  fromAccount: { select: DUO_ACCOUNT_SELECT },
  toAccount: { select: DUO_ACCOUNT_SELECT },
} as const;

@Injectable()
export class DuoRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(fromUserId: string, input: CreateDuoRequestInput) {
    if (input.toUserId === fromUserId) {
      throw new BadRequestException(
        'No puedes enviarte una solicitud a ti mismo.',
      );
    }

    const [mine, theirs] = await Promise.all([
      this.prisma.duoProfile.findUnique({
        where: { userId: fromUserId },
        include: { account: { select: DUO_ACCOUNT_SELECT } },
      }),
      this.prisma.duoProfile.findUnique({
        where: { userId: input.toUserId },
        include: { account: { select: DUO_ACCOUNT_SELECT } },
      }),
    ]);
    if (!mine?.active || !mine.account.verifiedAt) {
      throw new BadRequestException(
        'Activa tu perfil de duo antes de enviar solicitudes.',
      );
    }
    if (!theirs?.active || !theirs.account.verifiedAt) {
      throw new NotFoundException('Este jugador ya no está buscando duo.');
    }

    const queue = mine.queue as DuoQueue;
    if (
      theirs.queue !== queue ||
      theirs.account.server !== mine.account.server ||
      !canDuo(
        queue,
        rankForQueue(mine.account, queue),
        rankForQueue(theirs.account, queue),
      )
    ) {
      throw new BadRequestException(
        'Riot no permite que estas cuentas jueguen juntas en esta cola.',
      );
    }

    const pair = [
      { fromUserId, toUserId: input.toUserId },
      { fromUserId: input.toUserId, toUserId: fromUserId },
    ];
    const [pendingBetween, activeDuo, pendingSent] = await Promise.all([
      this.prisma.duoRequest.findFirst({
        where: { status: 'pending', OR: pair },
      }),
      this.prisma.duo.findFirst({
        where: {
          endedAt: null,
          OR: [
            { userAId: fromUserId, userBId: input.toUserId },
            { userAId: input.toUserId, userBId: fromUserId },
          ],
        },
      }),
      this.prisma.duoRequest.count({
        where: { fromUserId, status: 'pending' },
      }),
    ]);
    if (pendingBetween)
      throw new ConflictException(
        'Ya hay una solicitud pendiente entre ustedes.',
      );
    if (activeDuo) throw new ConflictException('Ya son duo.');
    if (pendingSent >= MAX_PENDING_SENT_REQUESTS) {
      throw new ConflictException(
        `Tienes ${MAX_PENDING_SENT_REQUESTS} solicitudes sin responder. Espera respuesta o cancela alguna.`,
      );
    }

    return this.prisma.duoRequest.create({
      data: {
        fromUserId,
        toUserId: input.toUserId,
        fromAccountId: mine.accountId,
        toAccountId: theirs.accountId,
        queue,
        message: input.message || null,
      },
    });
  }

  /** Pending requests in both directions, with the other side's account. */
  async listPending(userId: string) {
    const requests = await this.prisma.duoRequest.findMany({
      where: {
        status: 'pending',
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    const toView = (request: (typeof requests)[number]) => {
      const sent = request.fromUserId === userId;
      return {
        id: request.id,
        queue: request.queue,
        message: request.message,
        createdAt: request.createdAt,
        otherUserId: sent ? request.toUserId : request.fromUserId,
        account: toAccountCard(
          sent ? request.toAccount : request.fromAccount,
          request.queue,
        ),
      };
    };

    return {
      received: requests
        .filter((request) => request.toUserId === userId)
        .map(toView),
      sent: requests
        .filter((request) => request.fromUserId === userId)
        .map(toView),
    };
  }

  async accept(userId: string, requestId: string) {
    const request = await this.findPendingFor(requestId, userId, 'to');
    return this.prisma.$transaction(async (tx) => {
      await tx.duoRequest.update({
        where: { id: request.id },
        data: { status: 'accepted', respondedAt: new Date() },
      });
      return tx.duo.create({
        data: {
          requestId: request.id,
          userAId: request.fromUserId,
          userBId: request.toUserId,
          accountAId: request.fromAccountId,
          accountBId: request.toAccountId,
          queue: request.queue,
        },
      });
    });
  }

  async decline(userId: string, requestId: string) {
    const request = await this.findPendingFor(requestId, userId, 'to');
    return this.prisma.duoRequest.update({
      where: { id: request.id },
      data: { status: 'declined', respondedAt: new Date() },
    });
  }

  async cancel(userId: string, requestId: string) {
    const request = await this.findPendingFor(requestId, userId, 'from');
    return this.prisma.duoRequest.update({
      where: { id: request.id },
      data: { status: 'cancelled', respondedAt: new Date() },
    });
  }

  private async findPendingFor(
    requestId: string,
    userId: string,
    side: 'from' | 'to',
  ) {
    const request = await this.prisma.duoRequest.findUnique({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });
    if (!request) throw new NotFoundException('La solicitud no existe.');
    const owner = side === 'to' ? request.toUserId : request.fromUserId;
    if (owner !== userId)
      throw new ForbiddenException('No tienes acceso a esta solicitud.');
    if (request.status !== 'pending') {
      throw new ConflictException('Esta solicitud ya fue respondida.');
    }
    return request;
  }
}
