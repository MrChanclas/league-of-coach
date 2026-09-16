import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RankSnapshotsService } from '../rank-snapshots/rank-snapshots.service';
import {
  HISTORY_QUEUE_IDS,
  QUEUE_KEY_BY_ID,
  type QueueKey,
} from '../common/queue';

/**
 * Lado de solo lectura del historial: leer partidas ya guardadas y
 * enriquecerlas para la vista. No descarga nada de Riot ni escribe en la
 * base — de eso se encarga MatchesService, que sí consume la API y tiene que
 * respetar su límite de peticiones.
 */
@Injectable()
export class MatchHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankSnapshots: RankSnapshotsService,
  ) {}

  async listByAccount(accountId: string, page: number, pageSize: number) {
    const where = { accountId, match: { queueId: { in: HISTORY_QUEUE_IDS } } };

    const [items, total] = await Promise.all([
      this.prisma.matchParticipant.findMany({
        where,
        include: { match: true },
        orderBy: { match: { gameCreation: 'desc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.matchParticipant.count({ where }),
    ]);

    const matchIds = items.map((item) => item.matchId);
    const siblings = matchIds.length
      ? await this.prisma.matchParticipant.findMany({
          where: { matchId: { in: matchIds } },
          select: { matchId: true, damageDealt: true },
        })
      : [];

    const damagesByMatch = new Map<string, number[]>();
    for (const sibling of siblings) {
      const list = damagesByMatch.get(sibling.matchId) ?? [];
      list.push(sibling.damageDealt);
      damagesByMatch.set(sibling.matchId, list);
    }

    const lpDeltaByItemId = await this.estimateLpDeltas(accountId, items);

    const enrichedItems = items.map((item) => ({
      ...item,
      damagePercentile: this.computeDamagePercentile(
        item.damageDealt,
        damagesByMatch.get(item.matchId) ?? [item.damageDealt],
      ),
      lpDelta: lpDeltaByItemId.get(item.id) ?? null,
    }));

    return { items: enrichedItems, total, page, pageSize };
  }

  private computeDamagePercentile(value: number, all: number[]) {
    if (all.length <= 1) return 100;
    const lessOrEqual = all.filter((entry) => entry <= value).length;
    return Math.round(((lessOrEqual - 1) / (all.length - 1)) * 100);
  }

  /**
   * Best-effort LP delta for ranked matches: Riot doesn't expose this
   * directly, so we bracket the match's end time between the two nearest
   * rank snapshots (from manual syncs or the periodic poller) and diff
   * their LP — but only when that's actually trustworthy: same tier/division
   * on both sides (no promotion/demotion math), and exactly one ranked game
   * of that queue played in the bracketed window (otherwise the delta would
   * be an aggregate across multiple games, not this one). Falls back to null
   * (rendered as "—") whenever either condition isn't met.
   */
  private async estimateLpDeltas(
    accountId: string,
    items: Array<{
      id: string;
      match: { queueId: number; gameCreation: Date; gameDuration: number };
    }>,
  ): Promise<Map<string, number | null>> {
    const deltas = new Map<string, number | null>();

    const neededQueues = new Set<QueueKey>();
    for (const item of items) {
      const key = QUEUE_KEY_BY_ID[item.match.queueId];
      if (key) neededQueues.add(key);
    }
    if (neededQueues.size === 0) return deltas;

    const snapshotsByQueue = new Map<
      QueueKey,
      Awaited<ReturnType<RankSnapshotsService['getAllHistory']>>
    >();
    for (const key of neededQueues) {
      snapshotsByQueue.set(
        key,
        await this.rankSnapshots.getAllHistory(accountId, key),
      );
    }

    const rankedParticipants = await this.prisma.matchParticipant.findMany({
      where: { accountId, match: { queueId: { in: HISTORY_QUEUE_IDS } } },
      select: {
        match: {
          select: { queueId: true, gameCreation: true, gameDuration: true },
        },
      },
    });
    const endTimesByQueue = new Map<QueueKey, number[]>();
    for (const participant of rankedParticipants) {
      const key = QUEUE_KEY_BY_ID[participant.match.queueId];
      if (!key) continue;
      const endTime =
        participant.match.gameCreation.getTime() +
        participant.match.gameDuration * 1000;
      const list = endTimesByQueue.get(key) ?? [];
      list.push(endTime);
      endTimesByQueue.set(key, list);
    }

    for (const item of items) {
      const key = QUEUE_KEY_BY_ID[item.match.queueId];
      if (!key) {
        deltas.set(item.id, null);
        continue;
      }

      const snapshots = snapshotsByQueue.get(key) ?? [];
      const endTime =
        item.match.gameCreation.getTime() + item.match.gameDuration * 1000;

      const before = [...snapshots]
        .reverse()
        .find((s) => s.capturedAt.getTime() <= endTime);
      const after = snapshots.find((s) => s.capturedAt.getTime() > endTime);

      if (
        !before ||
        !after ||
        before.tier !== after.tier ||
        before.division !== after.division
      ) {
        deltas.set(item.id, null);
        continue;
      }

      const windowMatchCount = (endTimesByQueue.get(key) ?? []).filter(
        (t) =>
          t > before.capturedAt.getTime() && t <= after.capturedAt.getTime(),
      ).length;

      deltas.set(item.id, windowMatchCount === 1 ? after.lp - before.lp : null);
    }

    return deltas;
  }

  async findOne(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { matchId },
      include: { participants: { include: { account: true } } },
    });

    if (!match) {
      throw new NotFoundException('No se encontró la partida indicada.');
    }

    return match;
  }
}
