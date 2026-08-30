import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MatchesService } from './matches.service';

const SyncMatchesSchema = z.object({
  count: z.number().int().min(1).max(20).optional(),
});

const ListMatchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('sync/:accountId')
  sync(
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(SyncMatchesSchema))
    body: z.infer<typeof SyncMatchesSchema>,
  ) {
    return this.matchesService.syncAccount(accountId, body.count ?? 10);
  }

  @Get('account/:accountId')
  listByAccount(
    @Param('accountId') accountId: string,
    @Query(new ZodValidationPipe(ListMatchesQuerySchema))
    query: z.infer<typeof ListMatchesQuerySchema>,
  ) {
    return this.matchesService.listByAccount(
      accountId,
      query.page,
      query.pageSize,
    );
  }

  @Get(':matchId')
  findOne(@Param('matchId') matchId: string) {
    return this.matchesService.findOne(matchId);
  }
}
