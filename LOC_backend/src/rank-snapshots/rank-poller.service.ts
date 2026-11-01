import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RankSnapshotsService } from './rank-snapshots.service';

/**
 * Runs the rank poll automatically in local dev, where the Nest process just
 * stays up. Deliberately inert on Cloud Run, for the same reason as
 * BackfillPollerService: Cloud Scheduler already polls there through
 * RankSnapshotsController, and a tick from any instance that happens to be up
 * would only repeat the poll, spending the shared Riot key twice.
 */
@Injectable()
export class RankPollerService {
  private readonly logger = new Logger(RankPollerService.name);

  constructor(private readonly rankSnapshots: RankSnapshotsService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handlePeriodicPoll() {
    if (process.env.K_SERVICE) return;

    this.logger.log('Ejecutando polling automático de rango (proceso local).');
    await this.rankSnapshots.pollAllAccounts();
  }
}
