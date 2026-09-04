import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { StatsService } from './stats.service';

const CompareQuerySchema = z.object({
  matchIdA: z.string().min(1),
  matchIdB: z.string().min(1),
  accountId: z.string().min(1),
});

const CompareRollingQuerySchema = z.object({
  matchId: z.string().min(1),
  accountId: z.string().min(1),
  window: z.coerce.number().int().min(1).max(100).default(20),
});

const DaysQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(7),
});

const ChampionsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

@Controller('stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly authz: AuthzService,
  ) {}

  @Get('account/:accountId')
  async getAccountSummary(@Req() request: AuthenticatedRequest, @Param('accountId') accountId: string) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.statsService.getAccountSummary(accountId);
  }

  @Get('account/:accountId/by-queue/:queueId')
  async getAccountSummaryByQueue(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Param('queueId') queueId: string,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.statsService.getAccountSummaryByQueue(
      accountId,
      Number(queueId),
    );
  }

  @Get('account/:accountId/by-champion')
  async getByChampion(@Req() request: AuthenticatedRequest, @Param('accountId') accountId: string) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.statsService.getByChampion(accountId);
  }

  @Get('account/:accountId/champions')
  async getChampionsForSplit(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Query(new ZodValidationPipe(ChampionsQuerySchema))
    query: z.infer<typeof ChampionsQuerySchema>,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.statsService.getByChampion(accountId, query.days);
  }

  @Get('account/:accountId/activity')
  async getWeeklyActivity(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Query(new ZodValidationPipe(DaysQuerySchema))
    query: z.infer<typeof DaysQuerySchema>,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.statsService.getWeeklyActivity(accountId, query.days);
  }

  @Get('account/:accountId/streak')
  async getStreak(@Req() request: AuthenticatedRequest, @Param('accountId') accountId: string) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.statsService.getStreak(accountId);
  }

  @Get('account/:accountId/lanes')
  async getLaneDistribution(@Req() request: AuthenticatedRequest, @Param('accountId') accountId: string) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.statsService.getLaneDistribution(accountId);
  }

  @Get('compare')
  async compareMatches(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(CompareQuerySchema))
    query: z.infer<typeof CompareQuerySchema>,
  ) {
    await this.authz.assertAccountOwnership(query.accountId, request.clerkUserId);
    return this.statsService.compareMatches(
      query.accountId,
      query.matchIdA,
      query.matchIdB,
    );
  }

  @Get('compare/rolling')
  async compareToRollingAverage(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(CompareRollingQuerySchema))
    query: z.infer<typeof CompareRollingQuerySchema>,
  ) {
    await this.authz.assertAccountOwnership(query.accountId, request.clerkUserId);
    return this.statsService.compareToRollingAverage(
      query.accountId,
      query.matchId,
      query.window,
    );
  }
}
