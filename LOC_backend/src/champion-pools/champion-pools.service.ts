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
import { PoolStatsIndex } from './pool-stats';
import type { EnrichedPoolEntry, PoolOutsider } from './pool-types';

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
    .max(POOL_SLOT_KEYS.length * MAX_CHAMPIONS_PER_ROLE),
});
export type ReplacePoolInput = z.infer<typeof ReplacePoolSchema>;

export const AddPoolEntrySchema = z.object({
  championKey: z.string().min(1),
  // The slot to add it to. Omitted, it lands in the lane the champion is
  // most played in (or FILL when that isn't a main line).
  role: z.enum(POOL_SLOT_KEYS).optional(),
});
export type AddPoolEntryInput = z.infer<typeof AddPoolEntrySchema>;

export const UpdatePoolEntrySchema = z.object({
  state: z.enum(POOL_ENTRY_STATES).optional(),
  note: z.string().max(140).nullable().optional(),
  role: z.enum(POOL_SLOT_KEYS).optional(),
});
export type UpdatePoolEntryInput = z.infer<typeof UpdatePoolEntrySchema>;

/**
 * Stored entries as the board shows them: each resolved to its slot, keeping
 * only the first per champion per slot. An entry saved under a line that is
 * no longer a main one falls into FILL and can collide with a FILL entry of
 * the same champion.
 */
function toSlottedEntries<
  T extends { championKey: string; role: string; position: number },
>(entries: T[], roleProfile: PoolRoleProfile) {
  const seen = new Set<string>();
  return [...entries]
    .sort((a, b) => a.position - b.position)
    .map((entry) => ({ entry, slot: resolvePoolSlot(entry.role, roleProfile) }))
    .filter(({ entry, slot }) => {
      const key = `${entry.championKey}|${slot}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

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

  /** Season, preferred-queue games per champion per lane — what every pool number reads. */
  private async getSeasonPositionTotals(accountId: string) {
    const preferredQueueId = await this.stats.getPreferredQueueId(accountId);
    return this.stats.getChampionPositionTotals(
      accountId,
      getCurrentSeasonStart(),
      preferredQueueId,
    );
  }

  async getPoolView(accountId: string) {
    const [pool, positionTotals, roster, roleProfile] = await Promise.all([
      this.prisma.championPool.findUnique({
        where: { accountId },
        include: { entries: true },
      }),
      this.getSeasonPositionTotals(accountId),
      this.roster.getRoster(),
      this.getRoleProfile(accountId),
    ]);

    const stats = new PoolStatsIndex(positionTotals, roleProfile);
    const rosterByKey = new Map(
      roster.map((champion) => [champion.championKey, champion]),
    );

    const slotted = toSlottedEntries(pool?.entries ?? [], roleProfile);
    const keysBySlot = new Map<PoolSlotKey, Set<string>>();
    for (const { entry, slot } of slotted) {
      const keys = keysBySlot.get(slot) ?? new Set<string>();
      keys.add(entry.championKey);
      keysBySlot.set(slot, keys);
    }
    const keysInSlot = (slot: PoolSlotKey) =>
      keysBySlot.get(slot) ?? new Set<string>();

    const entries: EnrichedPoolEntry[] = slotted.map(({ entry, slot }) => ({
      ...this.enrichEntry(entry, slot, rosterByKey, stats),
      performance: evaluateChampionPerformance(
        entry.championKey,
        slot,
        roster,
        stats,
        keysInSlot(slot),
      ),
    }));

    const outsiders: PoolOutsider[] = stats
      .champions()
      .flatMap((champion) =>
        stats
          .slotsPlayed(champion)
          .filter(({ slot }) => !keysInSlot(slot).has(champion))
          .map(({ slot, stat }) => ({
            championKey: champion,
            name: rosterByKey.get(champion)?.name ?? champion,
            role: slot,
            gamesPlayed: stat.gamesPlayed,
            winrate: stat.winrate,
            performance: evaluateChampionPerformance(
              champion,
              slot,
              roster,
              stats,
              keysInSlot(slot),
            ),
          })),
      )
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
    const [positionTotals, roster, existingPool, roleProfile] =
      await Promise.all([
        this.getSeasonPositionTotals(accountId),
        this.roster.getRoster(),
        this.prisma.championPool.findUnique({
          where: { accountId },
          include: { entries: true },
        }),
        this.getRoleProfile(accountId),
      ]);

    return computeRecommendation(
      roster,
      new PoolStatsIndex(positionTotals, roleProfile),
      toSlottedEntries(existingPool?.entries ?? [], roleProfile).map(
        ({ entry, slot }) => ({ championKey: entry.championKey, slot }),
      ),
      roleProfile,
    );
  }

  async replacePool(accountId: string, input: ReplacePoolInput) {
    const roleProfile = await this.getRoleProfile(accountId);
    const entries = input.entries.map((entry) => ({
      ...entry,
      role: resolvePoolSlot(entry.role, roleProfile),
    }));
    this.assertUniquePerSlot(entries);
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
    const roleProfile = await this.getRoleProfile(accountId);
    const slot = resolvePoolSlot(
      input.role ?? (await this.getPlayedRole(accountId, input.championKey)),
      roleProfile,
    );

    const pool = await this.prisma.championPool.upsert({
      where: { accountId },
      update: {},
      create: { accountId, source: 'manual' },
    });

    const existingEntries = await this.prisma.poolEntry.findMany({
      where: { poolId: pool.id },
      select: { championKey: true, role: true },
    });
    const slotEntries = existingEntries.filter(
      (entry) => resolvePoolSlot(entry.role, roleProfile) === slot,
    );
    if (slotEntries.some((entry) => entry.championKey === input.championKey)) {
      return this.getPoolView(accountId);
    }
    if (slotEntries.length >= MAX_CHAMPIONS_PER_ROLE) {
      throw new BadRequestException(
        `${POOL_SLOT_LABELS[slot]} ya tiene el máximo de ${MAX_CHAMPIONS_PER_ROLE} campeones.`,
      );
    }

    await this.prisma.poolEntry.upsert({
      where: {
        poolId_championKey_role: {
          poolId: pool.id,
          championKey: input.championKey,
          role: slot,
        },
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
    slot: PoolSlotKey,
    patch: UpdatePoolEntryInput,
  ) {
    const pool = await this.findPoolOrThrow(accountId);
    const roleProfile = await this.getRoleProfile(accountId);
    const championEntries = await this.prisma.poolEntry.findMany({
      where: { poolId: pool.id, championKey },
    });
    const target = this.findEntryInSlot(
      championEntries,
      championKey,
      slot,
      roleProfile,
    );

    const newSlot =
      patch.role !== undefined
        ? resolvePoolSlot(patch.role, roleProfile)
        : undefined;
    if (
      newSlot !== undefined &&
      championEntries.some(
        (entry) =>
          entry.id !== target.id &&
          resolvePoolSlot(entry.role, roleProfile) === newSlot,
      )
    ) {
      throw new BadRequestException(
        `${championKey} ya está en ${POOL_SLOT_LABELS[newSlot]}.`,
      );
    }

    await this.prisma.poolEntry.update({
      where: { id: target.id },
      data: {
        ...(patch.state !== undefined && { state: patch.state }),
        ...(patch.note !== undefined && { note: patch.note }),
        ...(newSlot !== undefined && { role: newSlot }),
      },
    });
    return this.getPoolView(accountId);
  }

  async removeEntry(accountId: string, championKey: string, slot: PoolSlotKey) {
    const pool = await this.findPoolOrThrow(accountId);
    const roleProfile = await this.getRoleProfile(accountId);
    const championEntries = await this.prisma.poolEntry.findMany({
      where: { poolId: pool.id, championKey },
    });
    this.findEntryInSlot(championEntries, championKey, slot, roleProfile);

    // Every stored row that shows up in this slot goes, so a hidden duplicate
    // (see toSlottedEntries) doesn't resurface once the visible one is gone.
    await this.prisma.poolEntry.deleteMany({
      where: {
        id: {
          in: championEntries
            .filter(
              (entry) => resolvePoolSlot(entry.role, roleProfile) === slot,
            )
            .map((entry) => entry.id),
        },
      },
    });
    return this.getPoolView(accountId);
  }

  /** The lane a champion is most played in this season, or its roster role without games. */
  private async getPlayedRole(accountId: string, championKey: string) {
    const preferredQueueId = await this.stats.getPreferredQueueId(accountId);
    const [roleMap, roster] = await Promise.all([
      this.stats.getPrimaryRoleByChampion(
        accountId,
        getCurrentSeasonStart(),
        preferredQueueId,
      ),
      this.roster.getRoster(),
    ]);
    const playedRole = roleMap.get(championKey);
    if (playedRole && isPoolRoleKey(playedRole)) return playedRole;
    return (
      roster.find((champion) => champion.championKey === championKey)?.role ??
      'MIDDLE'
    );
  }

  private findEntryInSlot<T extends { role: string; position: number }>(
    championEntries: T[],
    championKey: string,
    slot: PoolSlotKey,
    roleProfile: PoolRoleProfile,
  ): T {
    const target = [...championEntries]
      .sort((a, b) => a.position - b.position)
      .find((entry) => resolvePoolSlot(entry.role, roleProfile) === slot);
    if (!target) {
      throw new NotFoundException(
        `${championKey} no está en ${POOL_SLOT_LABELS[slot]}.`,
      );
    }
    return target;
  }

  /**
   * Runs after roles are resolved to slots: a champion can be in several
   * lines, but only once per line — and two off-lines requested for the same
   * champion (JUNGLE and TOP for a mid/adc player) both land in FILL.
   */
  private assertUniquePerSlot(
    entries: Array<{ championKey: string; role: PoolSlotKey }>,
  ) {
    const seen = new Set<string>();
    for (const entry of entries) {
      const key = `${entry.championKey}|${entry.role}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `${entry.championKey} está repetido en ${POOL_SLOT_LABELS[entry.role]}.`,
        );
      }
      seen.add(key);
    }
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
    stats: PoolStatsIndex,
  ): Omit<EnrichedPoolEntry, 'performance'> {
    const stat = stats.statInSlot(entry.championKey, slot);
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
