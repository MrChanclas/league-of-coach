import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
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
  POOL_ROLE_KEYS,
  POOL_ROLE_LABELS,
  isPoolRoleKey,
  isRoleCountValid,
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
        role: z.enum(POOL_ROLE_KEYS),
        state: z.enum(POOL_ENTRY_STATES).default('testing'),
        note: z.string().max(140).optional(),
        addedBy: z.enum(POOL_ADDED_BY).default('player'),
      }),
    )
    .max(POOL_ROLE_KEYS.length * MAX_CHAMPIONS_PER_ROLE)
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

      const countByRole = new Map<string, number>();
      for (const entry of entries) {
        countByRole.set(entry.role, (countByRole.get(entry.role) ?? 0) + 1);
      }
      for (const role of POOL_ROLE_KEYS) {
        const count = countByRole.get(role) ?? 0;
        if (!isRoleCountValid(count)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              count < MIN_CHAMPIONS_PER_ROLE
                ? `${POOL_ROLE_LABELS[role]} tiene ${count} campeón${count === 1 ? '' : 'es'}: hacen falta al menos ${MIN_CHAMPIONS_PER_ROLE} para que el rol sea válido.`
                : `${POOL_ROLE_LABELS[role]} tiene ${count} campeones: el máximo es ${MAX_CHAMPIONS_PER_ROLE}.`,
          });
        }
      }
    }),
});
export type ReplacePoolInput = z.infer<typeof ReplacePoolSchema>;

export const AddPoolEntrySchema = z.object({ championKey: z.string().min(1) });
export type AddPoolEntryInput = z.infer<typeof AddPoolEntrySchema>;

export const UpdatePoolEntrySchema = z.object({
  state: z.enum(POOL_ENTRY_STATES).optional(),
  note: z.string().max(140).nullable().optional(),
  role: z.enum(POOL_ROLE_KEYS).optional(),
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

  async getPoolView(accountId: string) {
    const [pool, championStats, roster] = await Promise.all([
      this.prisma.championPool.findUnique({
        where: { accountId },
        include: { entries: { orderBy: { position: 'asc' } } },
      }),
      this.stats.getByChampion(accountId) as Promise<ChampionStatEntry[]>,
      this.roster.getRoster(),
    ]);

    const rosterByKey = new Map(
      roster.map((champion) => [champion.championKey, champion]),
    );
    const statsByChampion = new Map(
      championStats.map((stat) => [stat.champion, stat]),
    );

    const entries: EnrichedPoolEntry[] = (pool?.entries ?? []).map((entry) =>
      this.enrichEntry(entry, rosterByKey, statsByChampion),
    );

    const poolChampionKeys = new Set(entries.map((entry) => entry.championKey));
    const roleMap = await this.stats.getPrimaryRoleByChampion(accountId);
    const outsiders: PoolOutsider[] = championStats
      .filter(
        (stat) => stat.gamesPlayed > 0 && !poolChampionKeys.has(stat.champion),
      )
      .map((stat) => {
        const playedRole = roleMap.get(stat.champion);
        return {
          championKey: stat.champion,
          name: rosterByKey.get(stat.champion)?.name ?? stat.champion,
          role:
            playedRole && isPoolRoleKey(playedRole)
              ? playedRole
              : (rosterByKey.get(stat.champion)?.role ?? 'MIDDLE'),
          gamesPlayed: stat.gamesPlayed,
          winrate: stat.winrate,
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
      entries,
      outsiders,
      health: computePoolHealth(entries),
    };
  }

  async getRecommendation(accountId: string) {
    const [championStats, roleMap, roster, existingPool] = await Promise.all([
      this.stats.getByChampion(accountId) as Promise<ChampionStatEntry[]>,
      this.stats.getPrimaryRoleByChampion(accountId),
      this.roster.getRoster(),
      this.prisma.championPool.findUnique({
        where: { accountId },
        include: { entries: true },
      }),
    ]);

    const existingKeys = new Set(
      (existingPool?.entries ?? []).map((entry) => entry.championKey),
    );
    return computeRecommendation(roster, championStats, roleMap, existingKeys);
  }

  async replacePool(accountId: string, input: ReplacePoolInput) {
    await this.prisma.$transaction(async (tx) => {
      const pool = await tx.championPool.upsert({
        where: { accountId },
        update: { source: input.source },
        create: { accountId, source: input.source },
      });

      await tx.poolEntry.deleteMany({ where: { poolId: pool.id } });

      if (input.entries.length > 0) {
        await tx.poolEntry.createMany({
          data: input.entries.map((entry, index) => ({
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
    const [roleMap, roster] = await Promise.all([
      this.stats.getPrimaryRoleByChampion(accountId),
      this.roster.getRoster(),
    ]);
    const rosterInfo = roster.find(
      (champion) => champion.championKey === input.championKey,
    );
    const playedRole = roleMap.get(input.championKey);
    const role =
      playedRole && isPoolRoleKey(playedRole)
        ? playedRole
        : (rosterInfo?.role ?? 'MIDDLE');

    const pool = await this.prisma.championPool.upsert({
      where: { accountId },
      update: {},
      create: { accountId, source: 'manual' },
    });

    const position = await this.prisma.poolEntry.count({
      where: { poolId: pool.id },
    });
    const roleCount = await this.prisma.poolEntry.count({
      where: { poolId: pool.id, role },
    });
    if (roleCount >= MAX_CHAMPIONS_PER_ROLE) {
      throw new BadRequestException(
        `${POOL_ROLE_LABELS[role]} ya tiene el máximo de ${MAX_CHAMPIONS_PER_ROLE} campeones.`,
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
        role,
        state: 'testing',
        addedBy: 'player',
        position,
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
    await this.prisma.poolEntry.update({
      where: { poolId_championKey: { poolId: pool.id, championKey } },
      data: {
        ...(patch.state !== undefined && { state: patch.state }),
        ...(patch.note !== undefined && { note: patch.note }),
        ...(patch.role !== undefined && { role: patch.role }),
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
      role: string;
      state: string;
      note: string | null;
      addedBy: string;
      position: number;
    },
    rosterByKey: Map<string, RosterChampion>,
    statsByChampion: Map<string, ChampionStatEntry>,
  ): EnrichedPoolEntry {
    const stat = statsByChampion.get(entry.championKey);
    return {
      championKey: entry.championKey,
      name: rosterByKey.get(entry.championKey)?.name ?? entry.championKey,
      role: isPoolRoleKey(entry.role) ? entry.role : 'MIDDLE',
      state: entry.state as EnrichedPoolEntry['state'],
      note: entry.note,
      addedBy: entry.addedBy as EnrichedPoolEntry['addedBy'],
      position: entry.position,
      gamesPlayed: stat?.gamesPlayed ?? 0,
      winrate: stat?.winrate ?? 0,
    };
  }
}
