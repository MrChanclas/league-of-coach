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

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

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
