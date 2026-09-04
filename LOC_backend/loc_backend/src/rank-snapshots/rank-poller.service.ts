import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RankSnapshotsService } from './rank-snapshots.service';

/**
 * Runs the rank poll automatically as long as this Nest process stays alive
 * (great for local dev with `start:dev`). In production on Cloud Run, where
 * the process can scale to zero between requests, this is only a bonus —
 * the reliable trigger there is Cloud Scheduler hitting the internal HTTP
 * endpoint in RankSnapshotsController.
 */
@Injectable()
export class RankPollerService {
  private readonly logger = new Logger(RankPollerService.name);

  constructor(private readonly rankSnapshots: RankSnapshotsService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handlePeriodicPoll() {
    this.logger.log('Ejecutando polling automático de rango (proceso local).');
    await this.rankSnapshots.pollAllAccounts();
  }
}
