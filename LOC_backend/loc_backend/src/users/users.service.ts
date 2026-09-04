import { Injectable } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discord: DiscordService,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        clerkId: createUserDto.clerkId,
        role: 'user',
      },
    });
  }

  async create(createUserDto: CreateUserDto) {
    return this.createUser(createUserDto);
  }

  async findOrCreateByClerkId(clerkId: string, name: string, email: string) {
    const existing = await this.prisma.user.findUnique({ where: { clerkId } });
    if (existing) {
      this.discord.notifySession(
        `🔐 Inicio de sesión: **${existing.name}** (${existing.email})`,
      );
      return existing;
    }

    const user = await this.prisma.user.create({
      data: { clerkId, name, email, role: 'user' },
    });
    this.discord.notifySession(
      `🆕 Nuevo registro: **${user.name}** (${user.email})`,
    );
    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        accounts: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        accounts: true,
      },
    });
  }

  async getUserDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const accounts = await this.prisma.lolAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const accountIds = accounts.map((account) => account.id);
    const learnings = accountIds.length
      ? await this.prisma.championLearning.findMany({
          where: {
            accountId: { in: accountIds },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const goals = accountIds.length
      ? await this.prisma.goal.findMany({
          where: {
            accountId: { in: accountIds },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const accountsWithDetails = await Promise.all(
      accounts.map(async (account) => ({
        ...account,
        learnings: learnings.filter((item) => item.accountId === account.id),
        goals: goals.filter((item) => item.accountId === account.id),
      })),
    );

    return {
      user,
      accounts: accountsWithDetails,
      learnings,
      goals,
      summary: {
        totalAccounts: accounts.length,
        totalGoals: goals.length,
        totalLearnings: learnings.length,
        activeFocus: learnings[0]?.champion ?? 'Sin foco activo',
      },
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.name ? { name: updateUserDto.name } : {}),
        ...(updateUserDto.email ? { email: updateUserDto.email } : {}),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
