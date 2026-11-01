import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export function accountNotVerified() {
  return new ForbiddenException({
    code: 'ACCOUNT_NOT_VERIFIED',
    message: 'Verifica que esta cuenta de Riot es tuya para usar esta función.',
  });
}

@Injectable()
export class AuthzService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUserId(clerkUserId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        'No se encontró un usuario para esta sesión. Recarga la página.',
      );
    }

    return user.id;
  }

  async assertUserOwnership(
    targetUserId: string,
    clerkUserId: string,
  ): Promise<void> {
    const userId = await this.resolveUserId(clerkUserId);
    if (userId !== targetUserId) {
      throw new ForbiddenException('No tienes acceso a este usuario.');
    }
  }

  async assertAccountOwnership(
    accountId: string,
    clerkUserId: string,
  ): Promise<void> {
    const userId = await this.resolveUserId(clerkUserId);
    const account = await this.prisma.lolAccount.findUnique({
      where: { id: accountId },
      select: { userId: true },
    });

    if (!account || account.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta cuenta.');
    }
  }

  /** For everything past read-only stats: the account must be proven theirs. */
  async assertVerifiedAccount(
    accountId: string,
    clerkUserId: string,
  ): Promise<void> {
    const userId = await this.resolveUserId(clerkUserId);
    const account = await this.prisma.lolAccount.findUnique({
      where: { id: accountId },
      select: { userId: true, verifiedAt: true },
    });

    if (!account || account.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta cuenta.');
    }
    if (!account.verifiedAt) throw accountNotVerified();
  }

  async assertHasVerifiedAccount(userId: string): Promise<void> {
    const verified = await this.prisma.lolAccount.findFirst({
      where: { userId, verifiedAt: { not: null } },
      select: { id: true },
    });

    if (!verified) throw accountNotVerified();
  }

  async assertMatchParticipant(
    matchId: string,
    clerkUserId: string,
  ): Promise<void> {
    const userId = await this.resolveUserId(clerkUserId);
    const participant = await this.prisma.matchParticipant.findFirst({
      where: { match: { matchId }, account: { userId } },
      select: { id: true },
    });

    if (!participant) {
      throw new ForbiddenException('No tienes acceso a esta partida.');
    }
  }

  async assertAdmin(clerkUserId: string): Promise<void> {
    const userId = await this.resolveUserId(clerkUserId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      throw new ForbiddenException('Requiere permisos de administrador.');
    }
  }
}
