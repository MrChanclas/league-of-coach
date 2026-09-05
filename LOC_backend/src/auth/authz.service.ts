import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
        'No se encontró un usuario para esta sesión. Llamá a POST /users/me primero.',
      );
    }

    return user.id;
  }

  async assertUserOwnership(targetUserId: string, clerkUserId: string): Promise<void> {
    const userId = await this.resolveUserId(clerkUserId);
    if (userId !== targetUserId) {
      throw new ForbiddenException('No tenés acceso a este usuario.');
    }
  }

  async assertAccountOwnership(accountId: string, clerkUserId: string): Promise<void> {
    const userId = await this.resolveUserId(clerkUserId);
    const account = await this.prisma.lolAccount.findUnique({
      where: { id: accountId },
      select: { userId: true },
    });

    if (!account || account.userId !== userId) {
      throw new ForbiddenException('No tenés acceso a esta cuenta.');
    }
  }

  async assertMatchParticipant(matchId: string, clerkUserId: string): Promise<void> {
    const userId = await this.resolveUserId(clerkUserId);
    const participant = await this.prisma.matchParticipant.findFirst({
      where: { match: { matchId }, account: { userId } },
      select: { id: true },
    });

    if (!participant) {
      throw new ForbiddenException('No tenés acceso a esta partida.');
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
