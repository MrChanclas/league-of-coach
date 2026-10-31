import { Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InternalSecretGuard } from '../auth/internal-secret.guard';
import { Public } from '../auth/public.decorator';
import { BackfillRunnerService } from './backfill-runner.service';

/**
 * Triggered by Cloud Scheduler in production (Cloud Run scales to zero, so
 * an in-process cron can't be relied on there). Not a user-facing endpoint:
 * see InternalSecretGuard, same as RankSnapshotsController.
 */
@Controller('internal')
export class MatchesInternalController {
  constructor(private readonly backfillRunner: BackfillRunnerService) {}

  @Public()
  @SkipThrottle()
  @UseGuards(InternalSecretGuard)
  @Post('continue-backfills')
  async continueBackfills() {
    return this.backfillRunner.continuePendingBackfills();
  }
}
