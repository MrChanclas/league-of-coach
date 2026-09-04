import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { RankSnapshotsService } from '../rank-snapshots/rank-snapshots.service';
import { AccountsService } from './accounts.service';

const CreateAccountSchema = z.object({
  summoner: z.string().min(2).max(80),
  tag: z.string().min(2).max(20),
  server: z.string().min(2).max(30),
  userId: z.string().min(1),
});

const RankHistoryQuerySchema = z.object({
  queue: z.enum(['solo', 'flex']).default('solo'),
  days: z.coerce.number().int().min(1).max(365).default(90),
});

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly rankSnapshotsService: RankSnapshotsService,
    private readonly authz: AuthzService,
  ) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateAccountSchema))
    body: z.infer<typeof CreateAccountSchema>,
  ) {
    await this.authz.assertUserOwnership(body.userId, request.clerkUserId);
    return this.accountsService.create(body);
  }

  @Post('search')
  async search(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateAccountSchema))
    body: z.infer<typeof CreateAccountSchema>,
  ) {
    await this.authz.assertUserOwnership(body.userId, request.clerkUserId);
    return this.accountsService.search(body);
  }

  @Get('user/:userId')
  async listByUser(@Req() request: AuthenticatedRequest, @Param('userId') userId: string) {
    await this.authz.assertUserOwnership(userId, request.clerkUserId);
    return this.accountsService.listByUser(userId);
  }

  @Get(':id')
  async findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    await this.authz.assertAccountOwnership(id, request.clerkUserId);
    return this.accountsService.findOne(id);
  }

  @Get(':id/rank-history')
  async getRankHistory(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(RankHistoryQuerySchema))
    query: z.infer<typeof RankHistoryQuerySchema>,
  ) {
    await this.authz.assertAccountOwnership(id, request.clerkUserId);
    return this.rankSnapshotsService.getHistory(id, query.queue, query.days);
  }

  @Delete(':id')
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    await this.authz.assertAccountOwnership(id, request.clerkUserId);
    return this.accountsService.remove(id);
  }
}
