import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentSeasonStart } from '../common/season';
import { MatchesService } from './matches.service';
import { SeasonRecoveryService } from './season-recovery.service';
import { BACKFILL_JOB_BUDGET_MS } from './sync-budgets';

/**
 * Reparte el trabajo de puesta al día ENTRE cuentas, mientras MatchesService
 * sincroniza una sola. Lo disparan Cloud Scheduler en producción y el cron
 * local, y su tarea es decidir a quién le toca la siguiente ronda y cuándo
 * parar: todas las cuentas comparten el límite de peticiones de una única
 * clave de Riot.
 */
@Injectable()
export class BackfillRunnerService {
  private readonly logger = new Logger(BackfillRunnerService.name);

  // Guard compartido por los dos disparadores, que corren en el mismo
  // intervalo de cinco minutos.
  private isBackfilling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly matches: MatchesService,
    private readonly seasonRecovery: SeasonRecoveryService,
  ) {}

  /**
   * Advances the season backfill of every account that still has one
   * pending, so a first full-season catch-up finishes on its own instead of
   * needing somebody to sit on the sync button (see the Cloud Scheduler job
   * in the deploy workflow, and BackfillPollerService for local dev).
   *
   * Accounts take turns one round at a time rather than one account being
   * drained before the next starts: they all share a single Riot key's rate
   * limit, so this way the newest linked account doesn't wait behind
   * somebody else's entire season. The call stops handing out rounds once
   * its time budget is spent, well inside Cloud Run's request timeout -
   * whatever is left simply continues on the next tick.
   */
  async continuePendingBackfills() {
    // Both triggers land here - Cloud Scheduler in production and the
    // in-process cron - and they run on the same five-minute beat, so
    // without a guard shared by both they overlap by design: two runs
    // walking the same accounts, spending the same rate limit twice and
    // racing each other to insert the same matches.
    if (this.isBackfilling) {
      this.logger.log('Backfill automatico ya en curso; se omite este tick.');
      return {
        accounts: 0,
        rounds: 0,
        synced: 0,
        recovered: 0,
        completed: 0,
        stillPending: 0,
        skipped: true,
      };
    }

    this.isBackfilling = true;
    try {
      return await this.runPendingBackfills();
    } finally {
      this.isBackfilling = false;
    }
  }

  private async runPendingBackfills() {
    const seasonStart = getCurrentSeasonStart();
    const startedAt = Date.now();

    const pending = await this.prisma.lolAccount.findMany({
      where: {
        OR: [
          { seasonBackfillDoneFor: null },
          { seasonBackfillDoneFor: { not: seasonStart } },
          { seasonRecoveryDoneFor: null },
          { seasonRecoveryDoneFor: { not: seasonStart } },
        ],
      },
      select: {
        id: true,
        summoner: true,
        tag: true,
        seasonBackfillDoneFor: true,
      },
      // Furthest from done first: an account whose sweep hasn't started
      // (null cursor) or is still up at recent games needs the budget more
      // than one already down near the start of the season.
      orderBy: { seasonBackfillCursor: { sort: 'desc', nulls: 'first' } },
    });

    // Riot's own list for the account always goes first; the recovery
    // fallback only takes the account's turns once that list has nothing
    // older left to give.
    const queue = pending.map((account) => ({
      ...account,
      backfillDone:
        account.seasonBackfillDoneFor?.getTime() === seasonStart.getTime(),
    }));
    let synced = 0;
    let recovered = 0;
    let completed = 0;
    let rounds = 0;

    while (
      queue.length > 0 &&
      Date.now() - startedAt < BACKFILL_JOB_BUDGET_MS
    ) {
      const account = queue.shift();
      if (!account) break;

      try {
        if (!account.backfillDone) {
          const result = await this.matches.syncAccount(account.id);
          rounds += 1;
          synced += result.synced;
          account.backfillDone = result.seasonBackfill.done;
          queue.push(account);
        } else {
          const result = await this.seasonRecovery.recoverSeasonGames(
            account.id,
          );
          rounds += 1;
          recovered += result.recovered;
          if (result.done) {
            completed += 1;
          } else {
            queue.push(account);
          }
        }
      } catch (error) {
        // Dropped from this tick's rotation, not from the job: its cursor
        // is untouched, so the next tick picks it up where it stopped.
        this.logger.warn(
          `No se pudo avanzar el backfill de ${account.summoner}#${account.tag}: ${error}`,
        );
      }
    }

    const stillPending = queue.length;
    this.logger.log(
      `Backfill automatico: ${rounds} ronda(s), ${synced} partida(s), ${recovered} recuperada(s) vía compañeros, ${completed} cuenta(s) completada(s), ${stillPending} pendiente(s).`,
    );

    return {
      accounts: pending.length,
      rounds,
      synced,
      recovered,
      completed,
      stillPending,
      skipped: false,
    };
  }
}
