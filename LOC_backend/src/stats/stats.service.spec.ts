import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QUEUE_IDS } from '../common/queue';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from './stats.service';

function participant(overrides: Record<string, unknown> = {}) {
  return {
    champion: 'Ahri',
    teamPosition: 'MIDDLE',
    win: true,
    kills: 6,
    deaths: 2,
    assists: 8,
    csTotal: 200,
    visionScore: 20,
    controlWardsPlaced: null,
    teamDamagePercentage: null,
    killParticipation: null,
    maxLevelLeadLaneOpponent: null,
    maxCsAdvantageOnLaneOpponent: null,
    turretTakedowns: null,
    soloKills: null,
    dragonTakedowns: null,
    baronTakedowns: null,
    riftHeraldTakedowns: null,
    teamDragonKills: null,
    teamBaronKills: null,
    teamRiftHeraldKills: null,
    match: {
      gameDuration: 20 * 60,
      gameCreation: new Date('2026-10-01T18:00:00Z'),
    },
    ...overrides,
  };
}

describe('StatsService', () => {
  let service: StatsService;

  const prismaMock = {
    lolAccount: { count: jest.fn(), findUnique: jest.fn() },
    matchParticipant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  function findManyWhere(call: number) {
    const [args] = prismaMock.matchParticipant.findMany.mock.calls[call] as [
      { where: unknown },
    ];
    return args.where;
  }

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(StatsService);
  });

  describe('getAccountSummary', () => {
    it('averages per game and computes KDA from the averages', async () => {
      prismaMock.matchParticipant.findMany.mockResolvedValue([
        participant({ win: true, kills: 6, deaths: 2, assists: 8 }),
        participant({ win: false, kills: 2, deaths: 6, assists: 4 }),
      ]);

      const summary = await service.getAccountSummary('acc-1');

      expect(summary).toMatchObject({
        gamesPlayed: 2,
        wins: 1,
        winrate: 0.5,
        avgKills: 4,
        avgDeaths: 4,
        avgAssists: 6,
        // (4 + 6) / 4
        avgKda: 2.5,
        // 200 CS over 20 minutes
        avgCsPerMin: 10,
      });
    });

    it('returns zeros instead of NaN for an account with no games', async () => {
      prismaMock.matchParticipant.findMany.mockResolvedValue([]);

      await expect(service.getAccountSummary('acc-1')).resolves.toEqual({
        gamesPlayed: 0,
        wins: 0,
        winrate: 0,
        avgKills: 0,
        avgDeaths: 0,
        avgAssists: 0,
        avgKda: 0,
        avgCsPerMin: 0,
      });
    });

    it('filters by season start and positions only when they are given', async () => {
      prismaMock.matchParticipant.findMany.mockResolvedValue([]);
      const since = new Date('2026-01-08T00:00:00Z');

      await service.getAccountSummary('acc-1', since, ['TOP']);
      await service.getAccountSummary('acc-1');

      expect(findManyWhere(0)).toEqual({
        accountId: 'acc-1',
        match: { gameCreation: { gte: since } },
        teamPosition: { in: ['TOP'] },
      });
      expect(findManyWhere(1)).toEqual({ accountId: 'acc-1' });
    });
  });

  describe('getPreferredQueueId', () => {
    it('picks the queue with the higher rank', async () => {
      prismaMock.lolAccount.findUnique.mockResolvedValue({
        soloTier: 'GOLD',
        soloDivision: 'II',
        soloLp: 10,
        flexTier: 'PLATINUM',
        flexDivision: 'IV',
        flexLp: 0,
      });

      await expect(service.getPreferredQueueId('acc-1')).resolves.toBe(
        QUEUE_IDS.FLEX,
      );
    });

    it('returns undefined when both queues are tied or the account is missing', async () => {
      prismaMock.lolAccount.findUnique.mockResolvedValueOnce({
        soloTier: 'Unranked',
        soloDivision: '',
        soloLp: 0,
        flexTier: 'Unranked',
        flexDivision: '',
        flexLp: 0,
      });
      prismaMock.lolAccount.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.getPreferredQueueId('acc-1'),
      ).resolves.toBeUndefined();
      await expect(
        service.getPreferredQueueId('acc-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getChampionPositionTotals', () => {
    it('merges the win and loss groups of the same champion and line', async () => {
      prismaMock.matchParticipant.groupBy.mockResolvedValue([
        {
          champion: 'Mel',
          teamPosition: 'MIDDLE',
          win: true,
          _count: { _all: 3 },
          _sum: { kills: 15, deaths: 6, assists: 12 },
        },
        {
          champion: 'Mel',
          teamPosition: 'MIDDLE',
          win: false,
          _count: { _all: 2 },
          _sum: { kills: 4, deaths: 10, assists: 6 },
        },
        {
          champion: 'Mel',
          teamPosition: 'UTILITY',
          win: false,
          _count: { _all: 1 },
          _sum: { kills: null, deaths: 3, assists: 9 },
        },
      ]);

      const totals = await service.getChampionPositionTotals('acc-1');

      expect(totals).toEqual([
        {
          champion: 'Mel',
          teamPosition: 'MIDDLE',
          gamesPlayed: 5,
          wins: 3,
          kills: 19,
          deaths: 16,
          assists: 18,
        },
        {
          champion: 'Mel',
          teamPosition: 'UTILITY',
          gamesPlayed: 1,
          wins: 0,
          kills: 0,
          deaths: 3,
          assists: 9,
        },
      ]);
    });
  });

  describe('getPrimaryRoleByChampion', () => {
    it("keeps each champion's most played line", async () => {
      prismaMock.matchParticipant.groupBy.mockResolvedValue([
        { champion: 'Pyke', teamPosition: 'UTILITY', _count: { _all: 9 } },
        { champion: 'Pyke', teamPosition: 'MIDDLE', _count: { _all: 2 } },
        { champion: 'Garen', teamPosition: 'TOP', _count: { _all: 4 } },
      ]);

      const roles = await service.getPrimaryRoleByChampion('acc-1');

      expect(Object.fromEntries(roles)).toEqual({
        Pyke: 'UTILITY',
        Garen: 'TOP',
      });
    });
  });

  describe('getStreak', () => {
    it('counts the run of results matching the latest game', async () => {
      prismaMock.matchParticipant.findMany.mockResolvedValue([
        { win: false },
        { win: false },
        { win: false },
        { win: true },
        { win: false },
      ]);

      await expect(service.getStreak('acc-1')).resolves.toEqual({
        type: 'loss',
        count: 3,
      });
    });

    it('reports no streak without games', async () => {
      prismaMock.matchParticipant.findMany.mockResolvedValue([]);

      await expect(service.getStreak('acc-1')).resolves.toEqual({
        type: 'none',
        count: 0,
      });
    });
  });

  describe('getLaneDistribution', () => {
    it('returns each lane share sorted by games, grouping blanks as UNKNOWN', async () => {
      prismaMock.matchParticipant.findMany.mockResolvedValue([
        { teamPosition: 'MIDDLE' },
        { teamPosition: 'MIDDLE' },
        { teamPosition: 'MIDDLE' },
        { teamPosition: '' },
      ]);

      await expect(service.getLaneDistribution('acc-1')).resolves.toEqual([
        { lane: 'MIDDLE', games: 3, share: 0.75 },
        { lane: 'UNKNOWN', games: 1, share: 0.25 },
      ]);
    });
  });

  describe('getWeeklyActivity', () => {
    it('buckets games by UTC day in chronological order', async () => {
      prismaMock.matchParticipant.findMany.mockResolvedValue([
        participant({
          win: false,
          match: {
            gameDuration: 30 * 60,
            gameCreation: new Date('2026-10-02T10:00:00Z'),
          },
        }),
        participant({
          win: true,
          match: {
            gameDuration: 20 * 60,
            gameCreation: new Date('2026-10-01T10:00:00Z'),
          },
        }),
        participant({
          win: true,
          match: {
            gameDuration: 25 * 60,
            gameCreation: new Date('2026-10-01T22:00:00Z'),
          },
        }),
      ]);

      await expect(service.getWeeklyActivity('acc-1', 7)).resolves.toEqual([
        { date: '2026-10-01', wins: 2, losses: 0, minutesPlayed: 45 },
        { date: '2026-10-02', wins: 0, losses: 1, minutesPlayed: 30 },
      ]);
    });
  });

  describe('getRoleMetrics', () => {
    it('leaves a metric null when no game carries the data for it', async () => {
      prismaMock.matchParticipant.findMany.mockResolvedValue([participant()]);

      const metrics = await service.getRoleMetrics('acc-1', 'MIDDLE');

      expect(metrics).toMatchObject({
        gamesPlayed: 1,
        csPerMin: 10,
        visionScorePerMin: 1,
        killParticipation: null,
        objectiveParticipation: null,
        soloKillDeathRatio: null,
      });
    });

    it("measures objective participation against the team's objectives", async () => {
      prismaMock.matchParticipant.findMany.mockResolvedValue([
        participant({
          dragonTakedowns: 2,
          baronTakedowns: 1,
          riftHeraldTakedowns: 0,
          teamDragonKills: 3,
          teamBaronKills: 1,
          teamRiftHeraldKills: 0,
          soloKills: 3,
          deaths: 0,
        }),
      ]);

      const metrics = await service.getRoleMetrics('acc-1', 'JUNGLE');

      // 3 of the team's 4 objectives; deaths floor at 1 for the ratio.
      expect(metrics.objectiveParticipation).toBe(0.75);
      expect(metrics.soloKillDeathRatio).toBe(3);
    });

    it('returns an empty profile without games', async () => {
      prismaMock.matchParticipant.findMany.mockResolvedValue([]);

      const metrics = await service.getRoleMetrics('acc-1', 'TOP');

      expect(metrics.gamesPlayed).toBe(0);
      expect(metrics.csPerMin).toBeNull();
    });
  });

  describe('compareMatches', () => {
    it('throws when either match is not this account’s', async () => {
      prismaMock.matchParticipant.findFirst
        .mockResolvedValueOnce(participant())
        .mockResolvedValueOnce(null);

      await expect(
        service.compareMatches('acc-1', 'LA2_1', 'LA2_2'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
