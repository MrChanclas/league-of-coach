import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import {
  RiotApiService,
  type RiotMatchDto,
  type RiotMatchParticipantDto,
} from '../riot/riot-api.service';
import {
  MATCH_FETCH_RETRIES,
  MatchIngestService,
} from './match-ingest.service';

// The retry backoff waits whole seconds between attempts; tests don't.
jest.mock('../common/sleep', () => ({ sleep: () => Promise.resolve() }));

function riotParticipant(
  overrides: Partial<RiotMatchParticipantDto> = {},
): RiotMatchParticipantDto {
  return {
    puuid: 'puuid-other',
    participantId: 2,
    championName: 'Garen',
    championId: 86,
    teamPosition: 'TOP',
    teamId: 100,
    win: true,
    kills: 4,
    deaths: 3,
    assists: 6,
    totalMinionsKilled: 180,
    neutralMinionsKilled: 20,
    goldEarned: 11000,
    visionScore: 18,
    totalDamageDealtToChampions: 21000,
    summoner1Id: 4,
    summoner1Casts: 2,
    summoner2Id: 12,
    summoner2Casts: 0,
    challenges: { killParticipation: 0.5 },
    item0: 1,
    item1: 2,
    item2: 3,
    item3: 4,
    item4: 5,
    item5: 6,
    item6: 7,
    ...overrides,
  };
}

function riotMatch(participants: RiotMatchParticipantDto[]): RiotMatchDto {
  return {
    metadata: {
      matchId: 'LA2_100',
      participants: participants.map((p) => p.puuid),
    },
    info: {
      gameCreation: Date.parse('2026-10-01T18:00:00Z'),
      gameDuration: 25 * 60,
      gameMode: 'CLASSIC',
      gameVersion: '16.20.1',
      queueId: 420,
      participants,
      teams: [
        {
          teamId: 100,
          objectives: {
            dragon: { kills: 3 },
            baron: { kills: 1 },
            riftHerald: { kills: 0 },
          },
        },
      ],
    },
  };
}

describe('MatchIngestService', () => {
  let service: MatchIngestService;

  const prismaMock = {
    match: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    matchParticipant: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
      createMany: jest.fn(),
    },
    lolAccount: { findMany: jest.fn() },
    championLearning: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const riotMock = {
    getMatchById: jest.fn(),
    getMatchTimeline: jest.fn(),
  };

  type ParticipantRow = Record<string, unknown> & { accountId: string | null };

  function storedParticipants() {
    const [args] = prismaMock.matchParticipant.createMany.mock.calls[0] as [
      { data: ParticipantRow[]; skipDuplicates: boolean },
    ];
    return args;
  }

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MatchIngestService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RiotApiService, useValue: riotMock },
      ],
    }).compile();
    service = module.get(MatchIngestService);
  });

  describe('resolvePageIds', () => {
    it('keeps games missing this account’s row and relinks orphaned ones', async () => {
      prismaMock.match.findMany.mockResolvedValue([
        { id: 'm-stored', matchId: 'LA2_1' },
        { id: 'm-shared', matchId: 'LA2_2' },
        { id: 'm-orphan', matchId: 'LA2_3' },
      ]);
      prismaMock.matchParticipant.findMany.mockResolvedValue([
        { matchId: 'm-stored', accountId: 'acc-1' },
        { matchId: 'm-orphan', accountId: null },
      ]);
      prismaMock.matchParticipant.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.resolvePageIds('acc-1', 'puuid-me', [
        'LA2_1',
        'LA2_2',
        'LA2_3',
        'LA2_4',
      ]);

      // LA2_2 exists (another tracked account synced it) but has no row of
      // ours; LA2_4 isn't stored at all. Both have to be fetched.
      expect(result).toEqual({ newIds: ['LA2_2', 'LA2_4'], relinked: 1 });
      expect(prismaMock.matchParticipant.updateMany).toHaveBeenCalledWith({
        where: {
          matchId: { in: ['m-orphan'] },
          puuid: 'puuid-me',
          accountId: null,
        },
        data: { accountId: 'acc-1' },
      });
    });

    it('skips the participant lookup when none of the matches is stored', async () => {
      prismaMock.match.findMany.mockResolvedValue([]);

      const result = await service.resolvePageIds('acc-1', 'puuid-me', [
        'LA2_9',
      ]);

      expect(result).toEqual({ newIds: ['LA2_9'], relinked: 0 });
      expect(prismaMock.matchParticipant.findMany).not.toHaveBeenCalled();
      expect(prismaMock.matchParticipant.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('fetchMatchWithRetry', () => {
    it('retries a transient failure until Riot returns the match', async () => {
      const match = riotMatch([riotParticipant()]);
      riotMock.getMatchById
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('404'))
        .mockResolvedValueOnce(match);

      await expect(service.fetchMatchWithRetry('LAS', 'LA2_100')).resolves.toBe(
        match,
      );
      expect(riotMock.getMatchById).toHaveBeenCalledTimes(3);
    });

    it('gives up with the last error after every attempt fails', async () => {
      riotMock.getMatchById.mockRejectedValue(new Error('still 404'));

      await expect(
        service.fetchMatchWithRetry('LAS', 'LA2_100'),
      ).rejects.toThrow('still 404');
      expect(riotMock.getMatchById).toHaveBeenCalledTimes(MATCH_FETCH_RETRIES);
    });
  });

  describe('storeMatch', () => {
    function givenStorable() {
      prismaMock.match.upsert.mockResolvedValue({ id: 'm-1' });
      prismaMock.lolAccount.findMany.mockResolvedValue([
        { id: 'acc-friend', puuid: 'puuid-friend' },
      ]);
      prismaMock.matchParticipant.groupBy.mockResolvedValue([
        { teamPosition: 'TOP', _count: { _all: 20 } },
      ]);
      prismaMock.championLearning.findUnique.mockResolvedValue(null);
    }

    it('stores every participant, linking the accounts this app tracks', async () => {
      givenStorable();
      const match = riotMatch([
        riotParticipant({ puuid: 'puuid-me', participantId: 1 }),
        riotParticipant({ puuid: 'puuid-friend', participantId: 2 }),
        riotParticipant({ puuid: 'puuid-stranger', participantId: 3 }),
      ]);

      await service.storeMatch('acc-1', 'LAS', 'puuid-me', match);

      const { data, skipDuplicates } = storedParticipants();
      expect(skipDuplicates).toBe(true);
      expect(data.map((row) => row.accountId)).toEqual([
        'acc-1',
        'acc-friend',
        null,
      ]);
      expect(data[0]).toMatchObject({
        matchId: 'm-1',
        csTotal: 200,
        teamDragonKills: 3,
        teamBaronKills: 1,
        teleportCasts: 0,
        killParticipation: 0.5,
        turretTakedowns: null,
        itemIds: [1, 2, 3, 4, 5, 6, 7],
      });
      // A top laner gets no timeline-derived stats, so no extra Riot call.
      expect(riotMock.getMatchTimeline).not.toHaveBeenCalled();
    });

    it('writes nothing when the account is not in the match', async () => {
      await service.storeMatch(
        'acc-1',
        'LAS',
        'puuid-me',
        riotMatch([riotParticipant()]),
      );

      expect(prismaMock.match.upsert).not.toHaveBeenCalled();
      expect(prismaMock.matchParticipant.createMany).not.toHaveBeenCalled();
    });

    it('reuses the row another sync inserted first instead of failing', async () => {
      givenStorable();
      prismaMock.match.upsert.mockRejectedValue({ code: 'P2002' });
      prismaMock.match.findUnique.mockResolvedValue({ id: 'm-winner' });

      await service.storeMatch(
        'acc-1',
        'LAS',
        'puuid-me',
        riotMatch([riotParticipant({ puuid: 'puuid-me' })]),
      );

      const { data } = storedParticipants();
      expect(data[0].matchId).toBe('m-winner');
    });

    it('still stores the match when the timeline fetch fails', async () => {
      givenStorable();
      prismaMock.matchParticipant.groupBy.mockResolvedValue([
        { teamPosition: 'MIDDLE', _count: { _all: 20 } },
      ]);
      riotMock.getMatchTimeline.mockRejectedValue(new Error('timeout'));

      await service.storeMatch(
        'acc-1',
        'LAS',
        'puuid-me',
        riotMatch([
          riotParticipant({
            puuid: 'puuid-me',
            participantId: 1,
            teamPosition: 'MIDDLE',
          }),
        ]),
      );

      expect(riotMock.getMatchTimeline).toHaveBeenCalledTimes(1);
      const { data } = storedParticipants();
      expect(data[0]).toMatchObject({
        midRoamFramesTracked: null,
        midRoamFramesAway: null,
      });
    });

    it('folds the game into the champion running averages', async () => {
      givenStorable();
      prismaMock.championLearning.findUnique.mockResolvedValue({
        id: 'cl-1',
        games: 3,
        wins: 1,
        kdaK: 2,
        kdaD: 5,
        kdaA: 4,
        csMin: 6,
      });

      await service.storeMatch(
        'acc-1',
        'LAS',
        'puuid-me',
        riotMatch([
          riotParticipant({
            puuid: 'puuid-me',
            win: true,
            kills: 6,
            deaths: 1,
            assists: 8,
          }),
        ]),
      );

      expect(prismaMock.championLearning.update).toHaveBeenCalledWith({
        where: { id: 'cl-1' },
        data: {
          games: 4,
          wins: 2,
          kdaK: 3, // (2 * 3 + 6) / 4
          kdaD: 4, // (5 * 3 + 1) / 4
          kdaA: 5, // (4 * 3 + 8) / 4
          csMin: 6.5, // (6 * 3 + 200 CS / 25 min) / 4
        },
      });
    });
  });

  describe('storeNewMatches', () => {
    it('counts a failed download and keeps going with the rest', async () => {
      riotMock.getMatchById.mockImplementation((_server: string, id: string) =>
        id === 'LA2_bad'
          ? Promise.reject(new Error('404'))
          : Promise.resolve(
              riotMatch([riotParticipant({ puuid: 'puuid-me' })]),
            ),
      );
      prismaMock.match.upsert.mockResolvedValue({ id: 'm-1' });
      prismaMock.lolAccount.findMany.mockResolvedValue([]);
      prismaMock.matchParticipant.groupBy.mockResolvedValue([]);
      prismaMock.championLearning.findUnique.mockResolvedValue(null);

      const result = await service.storeNewMatches(
        { id: 'acc-1', server: 'LAS' },
        'puuid-me',
        ['LA2_bad', 'LA2_good'],
      );

      expect(result).toEqual({ synced: 1, failed: 1 });
    });
  });
});
