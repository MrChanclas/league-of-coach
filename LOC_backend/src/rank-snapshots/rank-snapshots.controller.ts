import { Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InternalSecretGuard } from '../auth/internal-secret.guard';
import { Public } from '../auth/public.decorator';
import { RankSnapshotsService } from './rank-snapshots.service';

/**
 * Triggered by Cloud Scheduler in production (Cloud Run scales to zero, so
 * an in-process cron can't be relied on there). Not a user-facing endpoint:
 * see InternalSecretGuard.
 */
@Controller('internal')
export class RankSnapshotsController {
  constructor(private readonly rankSnapshots: RankSnapshotsService) {}

  @Public()
  @SkipThrottle()
  @UseGuards(InternalSecretGuard)
  @Post('poll-ranks')
  async pollRanks() {
    return this.rankSnapshots.pollAllAccounts();
  }
}
