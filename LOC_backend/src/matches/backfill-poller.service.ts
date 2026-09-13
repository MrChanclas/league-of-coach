import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchesService } from './matches.service';

/**
 * Keeps the season backfill moving on its own as long as this Nest process
 * stays alive (which is what local dev gets). In production on Cloud Run,
 * where the process can scale to zero between requests, the reliable
 * trigger is Cloud Scheduler hitting MatchesInternalController - same
 * arrangement as RankPollerService.
 */
@Injectable()
export class BackfillPollerService {
  private readonly logger = new Logger(BackfillPollerService.name);
  // A tick can outlast the interval, and two overlapping ticks would just
  // race each other for the same Riot rate limit.
  private isRunning = false;

  constructor(private readonly matches: MatchesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePeriodicBackfill() {
    if (this.isRunning) return;

    this.isRunning = true;
    try {
      await this.matches.continuePendingBackfills();
    } catch (error) {
      this.logger.warn(`Backfill automatico fallido: ${error}`);
    } finally {
      this.isRunning = false;
    }
  }
}
