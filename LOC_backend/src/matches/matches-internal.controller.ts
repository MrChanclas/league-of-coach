import { Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MatchesService } from './matches.service';

/**
 * Triggered by Cloud Scheduler in production (Cloud Run scales to zero, so
 * an in-process cron can't be relied on there). Not a user-facing endpoint:
 * auth is a shared secret header instead of a Clerk session, same as
 * RankSnapshotsController.
 */
@Controller('internal')
export class MatchesInternalController {
  constructor(private readonly matches: MatchesService) {}

  @Public()
  @Post('continue-backfills')
  async continueBackfills(
    @Headers('x-internal-secret') providedSecret?: string,
  ) {
    const expectedSecret = process.env.INTERNAL_POLL_SECRET;

    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw new ForbiddenException(
        'Secreto interno inválido o no configurado.',
      );
    }

    return this.matches.continuePendingBackfills();
  }
}
