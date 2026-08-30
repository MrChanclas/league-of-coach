import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    lolAccount: {
      findMany: jest.fn(),
    },
    championLearning: {
      findMany: jest.fn(),
    },
    goal: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should create a user with account and internal profile data', async () => {
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Cris',
      email: 'cris@leagueofcoach.com',
      clerkId: 'clerk-1',
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    const result = await service.createUser({
      name: 'Cris',
      email: 'cris@leagueofcoach.com',
      clerkId: 'clerk-1',
    });

    expect(result).toMatchObject({
      id: 'user-1',
      name: 'Cris',
      email: 'cris@leagueofcoach.com',
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Cris',
        email: 'cris@leagueofcoach.com',
        clerkId: 'clerk-1',
        passwordHash: 'internal-user',
        role: 'user',
      },
    });
  });

  it('should build a dashboard summary for a user with goals, accounts and learnings', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Cris',
      email: 'cris@leagueofcoach.com',
      clerkId: 'clerk-1',
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    prismaMock.lolAccount.findMany.mockResolvedValue([
      {
        id: 'account-1',
        summoner: 'Lolcito',
        tag: 'EUW',
        server: 'EUW',
        soloTier: 'Gold',
        soloDivision: 'II',
        soloLp: 32,
        flexTier: 'Unranked',
        flexDivision: 'Unranked',
        flexLp: 0,
        userId: 'user-1',
      },
    ]);

    prismaMock.championLearning.findMany.mockResolvedValue([
      {
        id: 'learning-1',
        champion: 'Yasuo',
        role: 'Top',
        games: 12,
        wins: 7,
        kdaK: 5.2,
        kdaD: 3.1,
        kdaA: 7.4,
        csMin: 7.1,
        accountId: 'account-1',
      },
    ]);

    prismaMock.goal.findMany.mockResolvedValue([
      {
        id: 'goal-1',
        type: 'rank',
        title: 'Llegar a Platinum',
        progress: 60,
        deadline: new Date('2025-12-31T00:00:00Z'),
        accountId: 'account-1',
      },
    ]);

    const result = await service.getUserDashboard('user-1');

    expect(result.user).toMatchObject({
      id: 'user-1',
      name: 'Cris',
      email: 'cris@leagueofcoach.com',
    });
    expect(result.accounts).toHaveLength(1);
    expect(result.learnings).toHaveLength(1);
    expect(result.goals).toHaveLength(1);
    expect(result.summary.totalAccounts).toBe(1);
    expect(result.summary.totalGoals).toBe(1);
  });
});
