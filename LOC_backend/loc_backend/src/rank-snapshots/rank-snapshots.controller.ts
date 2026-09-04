import { Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { RankSnapshotsService } from './rank-snapshots.service';

/**
 * Triggered by Cloud Scheduler in production (Cloud Run scales to zero, so
 * an in-process cron can't be relied on there). Not a user-facing endpoint:
 * auth is a shared secret header instead of a Clerk session.
 */
@Controller('internal')
export class RankSnapshotsController {
  constructor(private readonly rankSnapshots: RankSnapshotsService) {}

  @Public()
  @Post('poll-ranks')
  async pollRanks(@Headers('x-internal-secret') providedSecret?: string) {
    const expectedSecret = process.env.INTERNAL_POLL_SECRET;

    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw new ForbiddenException('Secreto interno inválido o no configurado.');
    }

    return this.rankSnapshots.pollAllAccounts();
  }
}
