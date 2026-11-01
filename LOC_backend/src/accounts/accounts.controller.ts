import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { RankSnapshotsService } from '../rank-snapshots/rank-snapshots.service';
import {
  AccountVerificationService,
  StartVerificationSchema,
  type StartVerificationInput,
} from './account-verification.service';
import { AccountsService } from './accounts.service';

// Each of these spends the shared Riot key, so they get less room than the
// global per-IP limit.
const RIOT_LOOKUP_THROTTLE = { default: { ttl: 60_000, limit: 10 } };

const RankHistoryQuerySchema = z.object({
  queue: z.enum(['solo', 'flex']).default('solo'),
  days: z.coerce.number().int().min(1).max(365).default(90),
});

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly rankSnapshotsService: RankSnapshotsService,
    private readonly verification: AccountVerificationService,
    private readonly authz: AuthzService,
  ) {}

  // Accounts are only linked by passing this verification: see confirm().
  @Throttle(RIOT_LOOKUP_THROTTLE)
  @Post('verification')
  async startVerification(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(StartVerificationSchema))
    body: StartVerificationInput,
  ) {
    const userId = await this.authz.resolveUserId(request.clerkUserId);
    return this.verification.start(userId, body);
  }

  @Throttle(RIOT_LOOKUP_THROTTLE)
  @Post('verification/confirm')
  async confirmVerification(@Req() request: AuthenticatedRequest) {
    const userId = await this.authz.resolveUserId(request.clerkUserId);
    return this.verification.confirm(userId);
  }

  @Get('user/:userId')
  async listByUser(
    @Req() request: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
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
