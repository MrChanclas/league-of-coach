import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { LessonsService } from './lessons.service';

const GAME_MINUTES = 25;

// A game that trips none of the knowledge base thresholds for a mid laner:
// 8 CS/min, 1 vision/min, KDA 5, one turret, few deaths.
function healthyGame(overrides: Record<string, unknown> = {}) {
  return {
    kills: 5,
    deaths: 2,
    assists: 5,
    csTotal: 8 * GAME_MINUTES,
    visionScore: GAME_MINUTES,
    turretTakedowns: 1,
    dragonTakedowns: null,
    baronTakedowns: null,
    riftHeraldTakedowns: null,
    teamDragonKills: null,
    teamBaronKills: null,
    teamRiftHeraldKills: null,
    peelAdcDeathsTracked: null,
    peelAdcDeathsUnguarded: null,
    midRoamFramesTracked: null,
    midRoamFramesAway: null,
    teleportCasts: null,
    match: { gameDuration: GAME_MINUTES * 60 },
    ...overrides,
  };
}

function games(count: number, overrides: Record<string, unknown> = {}) {
  return Array.from({ length: count }, () => healthyGame(overrides));
}

describe('LessonsService', () => {
  let service: LessonsService;

  const statsMock = {
    getMainRoleProfile: jest.fn(),
    getPreferredQueueId: jest.fn(),
    getAccountSummary: jest.fn(),
    getStreak: jest.fn(),
    getLaneDistribution: jest.fn(),
    getChampionPositionTotals: jest.fn(),
  };

  const prismaMock = {
    championPool: { findUnique: jest.fn() },
    matchParticipant: { findMany: jest.fn() },
    lolAccount: { findUnique: jest.fn() },
  };

  // Configures one account; every field defaults to a healthy mid main.
  function givenAccount({
    primaryRole = 'MIDDLE',
    summary = {},
    seasonGames = games(10),
    streak = { type: 'win', count: 2 },
    lanes = [{ lane: primaryRole, games: 10, share: 1 }],
    poolEntries = [] as Array<{ championKey: string; role: string }>,
    positionTotals = [] as unknown[],
  }: {
    primaryRole?: string;
    summary?: Record<string, number>;
    seasonGames?: unknown[];
    streak?: { type: string; count: number };
    lanes?: unknown[];
    poolEntries?: Array<{ championKey: string; role: string }>;
    positionTotals?: unknown[];
  } = {}) {
    statsMock.getMainRoleProfile.mockResolvedValue({
      primaryRole,
      secondaryRole: null,
    });
    statsMock.getPreferredQueueId.mockResolvedValue(undefined);
    statsMock.getAccountSummary.mockResolvedValue({
      gamesPlayed: seasonGames.length,
      avgCsPerMin: 8,
      avgKills: 5,
      avgDeaths: 2,
      avgKda: 5,
      ...summary,
    });
    statsMock.getStreak.mockResolvedValue(streak);
    statsMock.getLaneDistribution.mockResolvedValue(lanes);
    statsMock.getChampionPositionTotals.mockResolvedValue(positionTotals);
    prismaMock.championPool.findUnique.mockResolvedValue({
      entries: poolEntries,
    });
    // The service reads the season rows first and the recent window second.
    prismaMock.matchParticipant.findMany
      .mockResolvedValueOnce(seasonGames)
      .mockResolvedValueOnce(seasonGames.slice(0, 5));
    prismaMock.lolAccount.findUnique.mockResolvedValue({
      soloTier: 'GOLD',
      flexTier: 'Unranked',
    });
  }

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: StatsService, useValue: statsMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(LessonsService);
  });

  it('returns no lessons for an account without games this season', async () => {
    givenAccount({ seasonGames: [] });

    await expect(service.generateForAccount('acc-1')).resolves.toEqual([]);
    expect(prismaMock.matchParticipant.findMany).not.toHaveBeenCalled();
  });

  it('returns no lessons when nothing crosses a threshold', async () => {
    givenAccount();

    await expect(service.generateForAccount('acc-1')).resolves.toEqual([]);
  });

  it("flags low CS only with the lesson scoped to the account's line", async () => {
    givenAccount({
      summary: { avgCsPerMin: 5 },
      seasonGames: games(10, { csTotal: 5 * GAME_MINUTES }),
    });

    const lessons = await service.generateForAccount('acc-1');

    expect(lessons).toHaveLength(1);
    expect(lessons[0]).toMatchObject({
      tag: 'MACRO',
      title: 'Alérgico al farming',
    });
    expect(lessons[0]).not.toHaveProperty('priority');
  });

  it('puts mental lessons ahead of a problem seen in only a few games', async () => {
    givenAccount({
      summary: { avgKda: 1.5 },
      seasonGames: [
        ...games(3, { kills: 1, deaths: 6, assists: 2 }),
        ...games(7),
      ],
      streak: { type: 'loss', count: 3 },
    });

    const lessons = await service.generateForAccount('acc-1');

    expect(lessons.map((lesson) => lesson.tag)).toEqual([
      'MENTALIDAD',
      'DUELOS',
    ]);
  });

  it('gates role-specific lessons on the main line', async () => {
    const unusedTeleport = games(3, { teleportCasts: 0 });

    givenAccount({ primaryRole: 'TOP', seasonGames: unusedTeleport });
    const asTop = await service.generateForAccount('acc-1');

    givenAccount({ primaryRole: 'MIDDLE', seasonGames: unusedTeleport });
    const asMid = await service.generateForAccount('acc-1');

    expect(asTop.map((lesson) => lesson.title)).toContain(
      '¡El Teleport es gratis!',
    );
    expect(asMid.map((lesson) => lesson.title)).not.toContain(
      '¡El Teleport es gratis!',
    );
  });

  it('attaches a champion lesson to a pool champion Pool Champ flags', async () => {
    givenAccount({
      poolEntries: [{ championKey: 'Ahri', role: 'MIDDLE' }],
      positionTotals: [
        {
          champion: 'Ahri',
          teamPosition: 'MIDDLE',
          gamesPlayed: 4,
          wins: 1,
          kills: 12,
          deaths: 20,
          assists: 16,
        },
      ],
    });

    const [lesson] = await service.generateForAccount('acc-1');

    expect(lesson).toMatchObject({
      kind: 'champion',
      championKey: 'Ahri',
      championRole: 'MIDDLE',
      championGamesPlayed: 4,
      championWinrate: 0.25,
    });
    expect(lesson.title).toContain('Ahri');
  });
});
