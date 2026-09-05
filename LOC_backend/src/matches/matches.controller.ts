import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { MatchesService } from './matches.service';

const SyncMatchesSchema = z.object({
  count: z.number().int().min(1).max(100).optional(),
});

const ListMatchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly authz: AuthzService,
  ) {}

  @Post('sync/:accountId')
  async sync(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(SyncMatchesSchema))
    body: z.infer<typeof SyncMatchesSchema>,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.matchesService.syncAccount(accountId, body.count);
  }

  @Get('account/:accountId')
  async listByAccount(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Query(new ZodValidationPipe(ListMatchesQuerySchema))
    query: z.infer<typeof ListMatchesQuerySchema>,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.matchesService.listByAccount(
      accountId,
      query.page,
      query.pageSize,
    );
  }

  @Get(':matchId')
  async findOne(@Req() request: AuthenticatedRequest, @Param('matchId') matchId: string) {
    await this.authz.assertMatchParticipant(matchId, request.clerkUserId);
    return this.matchesService.findOne(matchId);
  }
}
