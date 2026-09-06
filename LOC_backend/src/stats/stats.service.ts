import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ParticipantWithMatch = {
  champion: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  csTotal: number;
  match: { gameDuration: number };
};

type ParticipantWithMatchAndRole = ParticipantWithMatch & {
  teamPosition: string;
};

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public, platform-wide counter shown on the login screen (no auth). */
  async getPlatformStats() {
    const totalAccountsAnalyzed = await this.prisma.lolAccount.count();
    return { totalAccountsAnalyzed };
  }

  async getAccountSummary(accountId: string) {
    const participants = await this.prisma.matchParticipant.findMany({
      where: { accountId },
      include: { match: true },
    });

    return this.summarize(participants);
  }

  async getAccountSummaryByQueue(accountId: string, queueId: number) {
    const participants = await this.prisma.matchParticipant.findMany({
      where: { accountId, match: { queueId } },
      include: { match: true },
    });

    return this.summarize(participants);
  }

  async getByChampion(accountId: string, sinceDays?: number) {
    const since = sinceDays
      ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
      : undefined;

    const participants = await this.prisma.matchParticipant.findMany({
      where: {
        accountId,
        ...(since && { match: { gameCreation: { gte: since } } }),
      },
      include: { match: true },
    });

    const byChampion = new Map<string, ParticipantWithMatch[]>();
    for (const participant of participants) {
      const list = byChampion.get(participant.champion) ?? [];
      list.push(participant);
      byChampion.set(participant.champion, list);
    }

    return Array.from(byChampion.entries())
      .map(([champion, entries]) => ({ champion, ...this.summarize(entries) }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  }

  async getByRole(accountId: string) {
    const participants = await this.prisma.matchParticipant.findMany({
      where: { accountId },
      include: { match: true },
    });

    const byRole = new Map<string, ParticipantWithMatchAndRole[]>();
    for (const participant of participants) {
      const list = byRole.get(participant.teamPosition) ?? [];
      list.push(participant);
      byRole.set(participant.teamPosition, list);
    }

    return Array.from(byRole.entries())
      .map(([teamPosition, entries]) => ({
        teamPosition,
        ...this.summarize(entries),
      }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  }

  /**
   * Raw per-role stat averages needed to score role performance (see
   * common/role-performance.ts). Everything here reads straight off Riot's
   * per-participant challenges data (mostly already denormalized at
   * ingestion, including each row's own team objective totals) — no
   * teammate join needed.
   */
  async getRoleMetrics(accountId: string, teamPosition: string) {
    const participants = await this.prisma.matchParticipant.findMany({
      where: { accountId, teamPosition },
      include: { match: true },
    });

    const gamesPlayed = participants.length;
    if (gamesPlayed === 0) {
      return {
        gamesPlayed: 0,
        csPerMin: null as number | null,
        teamDamagePercentage: null as number | null,
        deathsAvg: null as number | null,
        killParticipation: null as number | null,
        objectiveParticipation: null as number | null,
        maxLevelLeadLaneOpponent: null as number | null,
        soloKillDeathRatio: null as number | null,
        turretTakedowns: null as number | null,
        maxCsAdvantageOnLaneOpponent: null as number | null,
        visionScorePerMin: null as number | null,
        controlWardsPerMin: null as number | null,
      };
    }

    const csPerMinValues: number[] = [];
    const visionPerMinValues: number[] = [];
    const deathsValues: number[] = [];
    const controlWardsPerMinValues: number[] = [];
    const teamDamagePercentageValues: number[] = [];
    const killParticipationValues: number[] = [];
    const objectiveParticipationValues: number[] = [];
    const maxLevelLeadValues: number[] = [];
    const soloKillDeathRatioValues: number[] = [];
    const turretTakedownsValues: number[] = [];
    const csAdvantageValues: number[] = [];

    for (const participant of participants) {
      const minutes = Math.max(participant.match.gameDuration / 60, 1);
      csPerMinValues.push(participant.csTotal / minutes);
      visionPerMinValues.push(participant.visionScore / minutes);
      deathsValues.push(participant.deaths);

      if (participant.controlWardsPlaced != null) {
        controlWardsPerMinValues.push(participant.controlWardsPlaced / minutes);
      }
      if (participant.teamDamagePercentage != null) {
        teamDamagePercentageValues.push(participant.teamDamagePercentage);
      }
      if (participant.killParticipation != null) {
        killParticipationValues.push(participant.killParticipation);
      }
      if (participant.maxLevelLeadLaneOpponent != null) {
        maxLevelLeadValues.push(participant.maxLevelLeadLaneOpponent);
      }
      if (participant.maxCsAdvantageOnLaneOpponent != null) {
        csAdvantageValues.push(participant.maxCsAdvantageOnLaneOpponent);
      }
      if (participant.turretTakedowns != null) {
        turretTakedownsValues.push(participant.turretTakedowns);
      }
      if (participant.soloKills != null) {
        soloKillDeathRatioValues.push(
          participant.soloKills / Math.max(participant.deaths, 1),
        );
      }

      const teamObjectiveTotal =
        (participant.teamDragonKills ?? 0) +
        (participant.teamBaronKills ?? 0) +
        (participant.teamRiftHeraldKills ?? 0);
      if (participant.dragonTakedowns != null && teamObjectiveTotal > 0) {
        const ownObjectiveTakedowns =
          (participant.dragonTakedowns ?? 0) +
          (participant.baronTakedowns ?? 0) +
          (participant.riftHeraldTakedowns ?? 0);
        objectiveParticipationValues.push(
          ownObjectiveTakedowns / teamObjectiveTotal,
        );
      }
    }

    return {
      gamesPlayed,
      csPerMin: this.average(csPerMinValues),
      visionScorePerMin: this.average(visionPerMinValues),
      deathsAvg: this.average(deathsValues),
      controlWardsPerMin: controlWardsPerMinValues.length
        ? this.average(controlWardsPerMinValues)
        : null,
      teamDamagePercentage: teamDamagePercentageValues.length
        ? this.average(teamDamagePercentageValues)
        : null,
      killParticipation: killParticipationValues.length
        ? this.average(killParticipationValues)
        : null,
      objectiveParticipation: objectiveParticipationValues.length
        ? this.average(objectiveParticipationValues)
        : null,
      maxLevelLeadLaneOpponent: maxLevelLeadValues.length
        ? this.average(maxLevelLeadValues)
        : null,
      soloKillDeathRatio: soloKillDeathRatioValues.length
        ? this.average(soloKillDeathRatioValues)
        : null,
      turretTakedowns: turretTakedownsValues.length
        ? this.average(turretTakedownsValues)
        : null,
      maxCsAdvantageOnLaneOpponent: csAdvantageValues.length
        ? this.average(csAdvantageValues)
        : null,
    };
  }

  async getWeeklyActivity(accountId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const participants = await this.prisma.matchParticipant.findMany({
      where: { accountId, match: { gameCreation: { gte: since } } },
      include: { match: true },
    });

    const byDay = new Map<
      string,
      { wins: number; losses: number; minutesPlayed: number }
    >();

    for (const participant of participants) {
      const dayKey = participant.match.gameCreation.toISOString().slice(0, 10);
      const bucket = byDay.get(dayKey) ?? {
        wins: 0,
        losses: 0,
        minutesPlayed: 0,
      };
      if (participant.win) {
        bucket.wins += 1;
      } else {
        bucket.losses += 1;
      }
      bucket.minutesPlayed += participant.match.gameDuration / 60;
      byDay.set(dayKey, bucket);
    }

    return Array.from(byDay.entries())
      .map(([date, bucket]) => ({
        date,
        wins: bucket.wins,
        losses: bucket.losses,
        minutesPlayed: Math.round(bucket.minutesPlayed),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getStreak(accountId: string) {
    const participants = await this.prisma.matchParticipant.findMany({
      where: { accountId },
      select: { win: true },
      orderBy: { match: { gameCreation: 'desc' } },
      take: 50,
    });

    if (participants.length === 0) {
      return { type: 'none' as const, count: 0 };
    }

    const type = participants[0].win ? ('win' as const) : ('loss' as const);
    let count = 0;
    for (const participant of participants) {
      if (participant.win === (type === 'win')) {
        count += 1;
      } else {
        break;
      }
    }

    return { type, count };
  }

  async getLaneDistribution(accountId: string) {
    const participants = await this.prisma.matchParticipant.findMany({
      where: { accountId },
      select: { teamPosition: true },
    });

    const total = participants.length;
    if (total === 0) return [];

    const counts = new Map<string, number>();
    for (const participant of participants) {
      const key = participant.teamPosition || 'UNKNOWN';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([lane, games]) => ({ lane, games, share: games / total }))
      .sort((a, b) => b.games - a.games);
  }

  async compareMatches(accountId: string, matchIdA: string, matchIdB: string) {
    const [participantA, participantB] = await Promise.all([
      this.prisma.matchParticipant.findFirst({
        where: { accountId, match: { matchId: matchIdA } },
        include: { match: true },
      }),
      this.prisma.matchParticipant.findFirst({
        where: { accountId, match: { matchId: matchIdB } },
        include: { match: true },
      }),
    ]);

    if (!participantA || !participantB) {
      throw new NotFoundException(
        'No se encontraron ambas partidas para esta cuenta.',
      );
    }

    return { matchA: participantA, matchB: participantB };
  }

  async compareToRollingAverage(
    accountId: string,
    matchId: string,
    window: number,
  ) {
    const target = await this.prisma.matchParticipant.findFirst({
      where: { accountId, match: { matchId } },
      include: { match: true },
    });

    if (!target) {
      throw new NotFoundException(
        'No se encontró la partida indicada para esta cuenta.',
      );
    }

    const rollingParticipants = await this.prisma.matchParticipant.findMany({
      where: { accountId, matchId: { not: target.matchId } },
      include: { match: true },
      orderBy: { match: { gameCreation: 'desc' } },
      take: window,
    });

    return {
      match: target,
      rollingAverage: this.summarize(rollingParticipants),
      window,
    };
  }

  private summarize(participants: ParticipantWithMatch[]) {
    const gamesPlayed = participants.length;

    if (gamesPlayed === 0) {
      return {
        gamesPlayed: 0,
        wins: 0,
        winrate: 0,
        avgKills: 0,
        avgDeaths: 0,
        avgAssists: 0,
        avgKda: 0,
        avgCsPerMin: 0,
      };
    }

    const wins = participants.filter((p) => p.win).length;
    const avgKills = this.average(participants.map((p) => p.kills));
    const avgDeaths = this.average(participants.map((p) => p.deaths));
    const avgAssists = this.average(participants.map((p) => p.assists));
    const avgCsPerMin = this.average(
      participants.map(
        (p) => p.csTotal / Math.max(p.match.gameDuration / 60, 1),
      ),
    );

    return {
      gamesPlayed,
      wins,
      winrate: wins / gamesPlayed,
      avgKills,
      avgDeaths,
      avgAssists,
      avgKda: (avgKills + avgAssists) / Math.max(avgDeaths, 1),
      avgCsPerMin,
    };
  }

  private average(values: number[]) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
