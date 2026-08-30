import { Controller, Get, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
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

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('account/:accountId')
  getAccountSummary(@Param('accountId') accountId: string) {
    return this.statsService.getAccountSummary(accountId);
  }

  @Get('account/:accountId/by-champion')
  getByChampion(@Param('accountId') accountId: string) {
    return this.statsService.getByChampion(accountId);
  }

  @Get('compare')
  compareMatches(
    @Query(new ZodValidationPipe(CompareQuerySchema))
    query: z.infer<typeof CompareQuerySchema>,
  ) {
    return this.statsService.compareMatches(
      query.accountId,
      query.matchIdA,
      query.matchIdB,
    );
  }

  @Get('compare/rolling')
  compareToRollingAverage(
    @Query(new ZodValidationPipe(CompareRollingQuerySchema))
    query: z.infer<typeof CompareRollingQuerySchema>,
  ) {
    return this.statsService.compareToRollingAverage(
      query.accountId,
      query.matchId,
      query.window,
    );
  }
}
