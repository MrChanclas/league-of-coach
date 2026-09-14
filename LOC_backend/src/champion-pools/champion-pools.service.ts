import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { getCurrentSeasonStart } from '../common/season';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { evaluateChampionPerformance } from './champion-performance';
import {
  ChampionRosterService,
  type RosterChampion,
} from './champion-roster.service';
import { computePoolHealth } from './pool-health';
import { computeRecommendation } from './pool-recommendation';
import {
  MAX_CHAMPIONS_PER_ROLE,
  MIN_CHAMPIONS_PER_ROLE,
  POOL_ADDED_BY,
  POOL_ENTRY_STATES,
  POOL_SLOT_KEYS,
  POOL_SLOT_LABELS,
  getPoolSlots,
  isPoolRoleKey,
  isRoleCountValid,
  resolvePoolSlot,
  toPoolRoleProfile,
  type PoolRoleProfile,
  type PoolSlotKey,
} from './pool-roles';
import type {
  ChampionStatEntry,
  EnrichedPoolEntry,
  PoolOutsider,
} from './pool-types';

export const ReplacePoolSchema = z.object({
  source: z.enum(['manual', 'coach']),
  entries: z
    .array(
      z.object({
        championKey: z.string().min(1),
        role: z.enum(POOL_SLOT_KEYS),
        state: z.enum(POOL_ENTRY_STATES).default('testing'),
        note: z.string().max(140).optional(),
        addedBy: z.enum(POOL_ADDED_BY).default('player'),
      }),
    )
    .max(POOL_SLOT_KEYS.length * MAX_CHAMPIONS_PER_ROLE)
    .superRefine((entries, ctx) => {
      const seenKeys = new Set<string>();
      for (const entry of entries) {
        if (seenKeys.has(entry.championKey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${entry.championKey} está repetido en el pool.`,
          });
        }
        seenKeys.add(entry.championKey);
      }
    }),
});
export type ReplacePoolInput = z.infer<typeof ReplacePoolSchema>;

export const AddPoolEntrySchema = z.object({ championKey: z.string().min(1) });
export type AddPoolEntryInput = z.infer<typeof AddPoolEntrySchema>;

export const UpdatePoolEntrySchema = z.object({
  state: z.enum(POOL_ENTRY_STATES).optional(),
  note: z.string().max(140).nullable().optional(),
  role: z.enum(POOL_SLOT_KEYS).optional(),
});
export type UpdatePoolEntryInput = z.infer<typeof UpdatePoolEntrySchema>;

@Injectable()
export class ChampionPoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly roster: ChampionRosterService,
  ) {}

  async getRoster() {
    return this.roster.getRoster();
  }

  private async getRoleProfile(accountId: string): Promise<PoolRoleProfile> {
    return toPoolRoleProfile(await this.stats.getMainRoleProfile(accountId));
  }

  async getPoolView(accountId: string) {
    const seasonStart = getCurrentSeasonStart();
    const preferredQueueId = await this.stats.getPreferredQueueId(accountId);
    const [pool, championStats, roster, roleMap, roleProfile] =
      await Promise.all([
        this.prisma.championPool.findUnique({
          where: { accountId },
          include: { entries: { orderBy: { position: 'asc' } } },
        }),
        this.stats.getByChampion(
          accountId,
          seasonStart,
          preferredQueueId,
        ) as Promise<ChampionStatEntry[]>,
        this.roster.getRoster(),
        this.stats.getPrimaryRoleByChampion(
          accountId,
          seasonStart,
          preferredQueueId,
        ),
        this.getRoleProfile(accountId),
      ]);

    const rosterByKey = new Map(
      roster.map((champion) => [champion.championKey, champion]),
    );
    const statsByChampion = new Map(
      championStats.map((stat) => [stat.champion, stat]),
    );

    const poolChampionKeys = new Set(
      (pool?.entries ?? []).map((entry) => entry.championKey),
    );

    const entries: EnrichedPoolEntry[] = (pool?.entries ?? []).map((entry) => {
      const base = this.enrichEntry(
        entry,
        resolvePoolSlot(entry.role, roleProfile),
        rosterByKey,
        statsByChampion,
      );
      // A champion already in the pool is never its own substitute.
      const excludeKeys = new Set(poolChampionKeys);
      excludeKeys.delete(entry.championKey);
      return {
        ...base,
        performance: evaluateChampionPerformance(
          entry.championKey,
          base.role,
          roster,
          championStats,
          roleMap,
          excludeKeys,
        ),
      };
    });

    const outsiders: PoolOutsider[] = championStats
      .filter(
        (stat) => stat.gamesPlayed > 0 && !poolChampionKeys.has(stat.champion),
      )
      .map((stat) => {
        const playedRole = roleMap.get(stat.champion);
        const role =
          playedRole && isPoolRoleKey(playedRole)
            ? playedRole
            : (rosterByKey.get(stat.champion)?.role ?? 'MIDDLE');
        return {
          championKey: stat.champion,
          name: rosterByKey.get(stat.champion)?.name ?? stat.champion,
          role,
          gamesPlayed: stat.gamesPlayed,
          winrate: stat.winrate,
          performance: evaluateChampionPerformance(
            stat.champion,
            role,
            roster,
            championStats,
            roleMap,
            poolChampionKeys,
          ),
        };
      })
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    return {
      pool: pool
        ? {
            id: pool.id,
            source: pool.source,
            createdAt: pool.createdAt,
            updatedAt: pool.updatedAt,
          }
        : null,
      roleProfile,
      entries,
      outsiders,
      health: computePoolHealth(entries, getPoolSlots(roleProfile)),
    };
  }

  async getRecommendation(accountId: string) {
    const seasonStart = getCurrentSeasonStart();
    const preferredQueueId = await this.stats.getPreferredQueueId(accountId);
    const [championStats, roleMap, roster, existingPool, roleProfile] =
      await Promise.all([
        this.stats.getByChampion(
          accountId,
          seasonStart,
          preferredQueueId,
        ) as Promise<ChampionStatEntry[]>,
        this.stats.getPrimaryRoleByChampion(
          accountId,
          seasonStart,
          preferredQueueId,
        ),
        this.roster.getRoster(),
        this.prisma.championPool.findUnique({
          where: { accountId },
          include: { entries: true },
        }),
        this.getRoleProfile(accountId),
      ]);

    const existingKeys = new Set(
      (existingPool?.entries ?? []).map((entry) => entry.championKey),
    );
    return computeRecommendation(
      roster,
      championStats,
      roleMap,
      existingKeys,
      roleProfile,
    );
  }

  async replacePool(accountId: string, input: ReplacePoolInput) {
    const roleProfile = await this.getRoleProfile(accountId);
    const entries = input.entries.map((entry) => ({
      ...entry,
      role: resolvePoolSlot(entry.role, roleProfile),
    }));
    this.assertSlotCounts(entries.map((entry) => entry.role));

    await this.prisma.$transaction(async (tx) => {
      const pool = await tx.championPool.upsert({
        where: { accountId },
        update: { source: input.source },
        create: { accountId, source: input.source },
      });

      await tx.poolEntry.deleteMany({ where: { poolId: pool.id } });

      if (entries.length > 0) {
        await tx.poolEntry.createMany({
          data: entries.map((entry, index) => ({
            poolId: pool.id,
            championKey: entry.championKey,
            role: entry.role,
            state: entry.state,
            note: entry.note ?? null,
            addedBy: entry.addedBy,
            position: index,
          })),
        });
      }
    });

    return this.getPoolView(accountId);
  }

  async addEntry(accountId: string, input: AddPoolEntryInput) {
    const [roleMap, roster, roleProfile] = await Promise.all([
      this.stats.getPrimaryRoleByChampion(accountId),
      this.roster.getRoster(),
      this.getRoleProfile(accountId),
    ]);
    const rosterInfo = roster.find(
      (champion) => champion.championKey === input.championKey,
    );
    const playedRole = roleMap.get(input.championKey);
    const role =
      playedRole && isPoolRoleKey(playedRole)
        ? playedRole
        : (rosterInfo?.role ?? 'MIDDLE');
    const slot = resolvePoolSlot(role, roleProfile);

    const pool = await this.prisma.championPool.upsert({
      where: { accountId },
      update: {},
      create: { accountId, source: 'manual' },
    });

    const existingEntries = await this.prisma.poolEntry.findMany({
      where: { poolId: pool.id },
      select: { role: true },
    });
    const slotCount = existingEntries.filter(
      (entry) => resolvePoolSlot(entry.role, roleProfile) === slot,
    ).length;
    if (slotCount >= MAX_CHAMPIONS_PER_ROLE) {
      throw new BadRequestException(
        `${POOL_SLOT_LABELS[slot]} ya tiene el máximo de ${MAX_CHAMPIONS_PER_ROLE} campeones.`,
      );
    }

    await this.prisma.poolEntry.upsert({
      where: {
        poolId_championKey: { poolId: pool.id, championKey: input.championKey },
      },
      update: {},
      create: {
        poolId: pool.id,
        championKey: input.championKey,
        role: slot,
        state: 'testing',
        addedBy: 'player',
        position: existingEntries.length,
      },
    });

    return this.getPoolView(accountId);
  }

  async updateEntry(
    accountId: string,
    championKey: string,
    patch: UpdatePoolEntryInput,
  ) {
    const pool = await this.findPoolOrThrow(accountId);
    const role =
      patch.role !== undefined
        ? resolvePoolSlot(patch.role, await this.getRoleProfile(accountId))
        : undefined;
    await this.prisma.poolEntry.update({
      where: { poolId_championKey: { poolId: pool.id, championKey } },
      data: {
        ...(patch.state !== undefined && { state: patch.state }),
        ...(patch.note !== undefined && { note: patch.note }),
        ...(role !== undefined && { role }),
      },
    });
    return this.getPoolView(accountId);
  }

  async removeEntry(accountId: string, championKey: string) {
    const pool = await this.findPoolOrThrow(accountId);
    await this.prisma.poolEntry.delete({
      where: { poolId_championKey: { poolId: pool.id, championKey } },
    });
    return this.getPoolView(accountId);
  }

  /**
   * Runs after roles are resolved to slots, not in the zod schema: a request
   * naming two off-lines (say JUNGLE and TOP for a mid/adc player) lands both
   * in FILL, so only the merged count says whether the pool is valid.
   */
  private assertSlotCounts(slots: PoolSlotKey[]) {
    const countBySlot = new Map<PoolSlotKey, number>();
    for (const slot of slots) {
      countBySlot.set(slot, (countBySlot.get(slot) ?? 0) + 1);
    }

    const issues: string[] = [];
    for (const [slot, count] of countBySlot) {
      if (isRoleCountValid(count)) continue;
      issues.push(
        count < MIN_CHAMPIONS_PER_ROLE
          ? `${POOL_SLOT_LABELS[slot]} tiene ${count} campeón${count === 1 ? '' : 'es'}: hacen falta al menos ${MIN_CHAMPIONS_PER_ROLE} para que la línea sea válida.`
          : `${POOL_SLOT_LABELS[slot]} tiene ${count} campeones: el máximo es ${MAX_CHAMPIONS_PER_ROLE}.`,
      );
    }
    if (issues.length > 0) {
      throw new BadRequestException(issues.join(' '));
    }
  }

  private async findPoolOrThrow(accountId: string) {
    const pool = await this.prisma.championPool.findUnique({
      where: { accountId },
    });
    if (!pool) {
      throw new NotFoundException(
        'Esta cuenta todavía no tiene un pool de campeones.',
      );
    }
    return pool;
  }

  private enrichEntry(
    entry: {
      championKey: string;
      state: string;
      note: string | null;
      addedBy: string;
      position: number;
    },
    slot: PoolSlotKey,
    rosterByKey: Map<string, RosterChampion>,
    statsByChampion: Map<string, ChampionStatEntry>,
  ): Omit<EnrichedPoolEntry, 'performance'> {
    const stat = statsByChampion.get(entry.championKey);
    return {
      championKey: entry.championKey,
      name: rosterByKey.get(entry.championKey)?.name ?? entry.championKey,
      role: slot,
      state: entry.state as EnrichedPoolEntry['state'],
      note: entry.note,
      addedBy: entry.addedBy as EnrichedPoolEntry['addedBy'],
      position: entry.position,
      gamesPlayed: stat?.gamesPlayed ?? 0,
      winrate: stat?.winrate ?? 0,
      avgKda: stat?.avgKda ?? 0,
    };
  }
}
