import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchesService } from './matches.service';

/**
 * Keeps the season backfill moving on its own in local dev, where the Nest
 * process just stays up and nothing else is scheduled against it.
 *
 * Deliberately inert on Cloud Run. There, CPU is only allocated while a
 * request is being handled, so a tick that starts outside one gets frozen
 * part-way through its sweep — and since it holds the service's backfill
 * guard while frozen, the Cloud Scheduler request that does have CPU finds
 * the guard taken and skips its own turn. An in-process cron there doesn't
 * just fail to help, it starves the trigger that works.
 */
@Injectable()
export class BackfillPollerService {
  private readonly logger = new Logger(BackfillPollerService.name);

  constructor(private readonly matches: MatchesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePeriodicBackfill() {
    // Cloud Run always sets K_SERVICE; Cloud Scheduler drives the backfill
    // there, through MatchesInternalController.
    if (process.env.K_SERVICE) return;

    try {
      // Overlapping ticks are already handled inside the service, which has
      // to guard against the scheduler anyway.
      await this.matches.continuePendingBackfills();
    } catch (error) {
      this.logger.warn(`Backfill automatico fallido: ${error}`);
    }
  }
}
