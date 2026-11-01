import { ForbiddenException, Injectable } from '@nestjs/common';
import { DISCORD_PROVIDERS, getClerkClient } from '../auth/clerk-client';
import { DiscordService } from '../discord/discord.service';
import { GoalsService } from '../goals/goals.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discord: DiscordService,
    private readonly goalsService: GoalsService,
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

  /**
   * Copies the Discord account linked in Clerk onto the user (or clears it
   * when unlinked). Read from Clerk rather than taken from the client, so a
   * duo partner can trust the username they're shown.
   */
  async syncDiscordIdentity(clerkId: string) {
    const clerkUser = await getClerkClient().users.getUser(clerkId);
    const discord = clerkUser.externalAccounts.find((account) =>
      DISCORD_PROVIDERS.has(account.provider),
    );

    return this.prisma.user.update({
      where: { clerkId },
      data: {
        discordId: discord?.externalId ?? null,
        discordUsername: discord?.username ?? null,
      },
      select: { discordId: true, discordUsername: true },
    });
  }

  /**
   * The primary email Clerk verified. Read from Clerk rather than taken from
   * the client: the email decides which existing user a new Clerk identity
   * gets attached to, so trusting the request would hand over anyone's account.
   */
  private async getVerifiedEmail(clerkId: string): Promise<string> {
    const clerkUser = await getClerkClient().users.getUser(clerkId);
    const primary = clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId,
    );
    if (primary?.verification?.status !== 'verified') {
      throw new ForbiddenException('Verifica tu correo para continuar.');
    }
    return primary.emailAddress;
  }

  async findOrCreateByClerkId(clerkId: string, name: string) {
    const existingByClerkId = await this.prisma.user.findUnique({
      where: { clerkId },
    });
    if (existingByClerkId) {
      this.discord.notifySession(
        `🔐 Inicio de sesión: **${existingByClerkId.name}**`,
      );
      return existingByClerkId;
    }

    const email = await this.getVerifiedEmail(clerkId);

    // Clerk can issue a new user id for the same person (account recreated,
    // login method switched, etc). Reconcile by email instead of trying to
    // insert a second row and hitting the unique constraint on email.
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingByEmail) {
      const updated = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { clerkId, name },
      });
      this.discord.notifySession(`🔐 Inicio de sesión: **${updated.name}**`);
      return updated;
    }

    const user = await this.prisma.user.create({
      data: { clerkId, name, email, role: 'user' },
    });
    this.discord.notifySession(`🆕 Nuevo registro: **${user.name}**`);
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

    const goalsByAccount = await Promise.all(
      accountIds.map((accountId) => this.goalsService.listByAccount(accountId)),
    );
    const goals = goalsByAccount.flat();

    // Armado sincrónico: solo filtra en memoria lo ya consultado arriba, así
    // que no necesita ser async ni pasar por Promise.all.
    const accountsWithDetails = accounts.map((account) => ({
      ...account,
      learnings: learnings.filter((item) => item.accountId === account.id),
      goals: goals.filter((item) => item.accountId === account.id),
    }));

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

  async markOnboardingCompleted(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { onboardingCompletedAt: new Date() },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.name ? { name: updateUserDto.name } : {}),
      },
    });
  }

  /**
   * Erases the user everywhere: their data cascades from the row, and the
   * Clerk identity goes too so they can't sign back in to an empty profile.
   * A Clerk failure is flagged for manual cleanup instead of undoing a
   * deletion the user already asked for.
   */
  async remove(id: string) {
    const user = await this.prisma.user.delete({
      where: { id },
      select: { clerkId: true },
    });

    try {
      await getClerkClient().users.deleteUser(user.clerkId);
    } catch (error) {
      this.discord.notifyIssue(
        `⚠️ No se pudo borrar de Clerk al usuario \`${user.clerkId}\`: ${(error as Error).message}`,
      );
    }
  }
}
