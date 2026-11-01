import {
  AccountVerificationService,
  pickChallengeIcon,
} from './account-verification.service';

describe('pickChallengeIcon', () => {
  it('never asks for the icon the account already has', () => {
    for (let current = 0; current < 29; current += 1) {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const icon = pickChallengeIcon(current);
        expect(icon).not.toBe(current);
        expect(icon).toBeGreaterThanOrEqual(0);
        expect(icon).toBeLessThan(29);
      }
    }
  });
});

describe('AccountVerificationService.start', () => {
  const input = { summoner: 'Owner', tag: 'LAS', server: 'LAS' };

  function build(pending: unknown) {
    const prisma = {
      accountVerification: {
        findUnique: jest.fn().mockResolvedValue(pending),
        upsert: jest
          .fn()
          .mockImplementation(({ create }: { create: unknown }) => create),
      },
      lolAccount: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const riotApi = {
      getAccountByRiotId: jest.fn().mockResolvedValue({
        puuid: 'puuid-1',
        gameName: 'Owner',
        tagLine: 'LAS',
      }),
      getSummonerByPuuid: jest.fn().mockResolvedValue({ profileIconId: 3 }),
    };
    const service = new AccountVerificationService(
      prisma as never,
      riotApi as never,
      {} as never,
      {} as never,
    );
    return { service, prisma };
  }

  const pending = {
    puuid: 'puuid-1',
    server: 'LAS',
    summoner: 'Owner',
    tag: 'LAS',
    iconId: 7,
    expiresAt: new Date(Date.now() + 60_000),
  };

  it('keeps the icon and deadline of a challenge still in progress', async () => {
    const { service, prisma } = build(pending);

    await expect(service.start('user-2', input)).resolves.toMatchObject({
      iconId: 7,
      expiresAt: pending.expiresAt,
    });
    expect(prisma.accountVerification.upsert).not.toHaveBeenCalled();
  });

  it('issues a new challenge once the previous one expired', async () => {
    const { service, prisma } = build({
      ...pending,
      expiresAt: new Date(Date.now() - 1),
    });

    await service.start('user-2', input);

    expect(prisma.accountVerification.upsert).toHaveBeenCalledTimes(1);
  });

  it('issues a new challenge when the user switches account', async () => {
    const { service, prisma } = build({ ...pending, puuid: 'puuid-2' });

    await service.start('user-2', input);

    expect(prisma.accountVerification.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('AccountVerificationService.confirm', () => {
  const challenge = {
    userId: 'user-2',
    puuid: 'puuid-1',
    server: 'LAS',
    summoner: 'Owner',
    tag: 'LAS',
    iconId: 7,
    expiresAt: new Date(Date.now() + 60_000),
  };

  function build(account: unknown, profileIconId = 7) {
    const prisma = {
      accountVerification: {
        findUnique: jest.fn().mockResolvedValue(challenge),
        delete: jest.fn().mockReturnValue('delete-challenge'),
      },
      lolAccount: {
        findUnique: jest.fn().mockResolvedValue(account),
        update: jest.fn().mockReturnValue('update-account'),
      },
      duo: { deleteMany: jest.fn() },
      duoRequest: { deleteMany: jest.fn() },
      duoProfile: { deleteMany: jest.fn() },
      goal: { deleteMany: jest.fn() },
      championPool: { deleteMany: jest.fn() },
      championLearning: { deleteMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([{ id: 'account-1' }]),
    };
    const riotApi = {
      getSummonerByPuuid: jest.fn().mockResolvedValue({ profileIconId }),
    };
    const accounts = {
      create: jest.fn().mockResolvedValue({ account: { id: 'new-account' } }),
    };
    const discord = { notifySession: jest.fn() };
    const service = new AccountVerificationService(
      prisma as never,
      riotApi as never,
      accounts as never,
      discord as never,
    );
    return { service, prisma, accounts, discord };
  }

  it('rejects when the account does not show the requested icon', async () => {
    const { service, prisma } = build(null, 3);

    await expect(service.confirm('user-2')).rejects.toThrow(
      'Riot todavía muestra el ícono n.º 3 y pedimos el n.º 7',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an expired challenge without calling Riot', async () => {
    const { service, prisma } = build(null);
    prisma.accountVerification.findUnique.mockResolvedValue({
      ...challenge,
      expiresAt: new Date(Date.now() - 1),
    });

    await expect(service.confirm('user-2')).rejects.toMatchObject({
      response: { code: 'VERIFICATION_EXPIRED' },
    });
  });

  it('tells the client when Riot does not show the icon yet', async () => {
    const { service } = build(null, 3);

    await expect(service.confirm('user-2')).rejects.toMatchObject({
      response: { code: 'ICON_NOT_UPDATED' },
    });
  });

  it('refuses to take an account another profile already verified', async () => {
    const { service, prisma } = build({
      id: 'account-1',
      userId: 'user-1',
      verifiedAt: new Date(),
    });

    await expect(service.confirm('user-2')).rejects.toThrow('otro perfil');
    expect(prisma.lolAccount.update).not.toHaveBeenCalled();
  });

  it('transfers an unverified account to the proven owner', async () => {
    const { service, prisma, discord } = build({
      id: 'account-1',
      userId: 'user-1',
      verifiedAt: null,
    });

    await service.confirm('user-2');

    expect(prisma.lolAccount.update).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: { userId: 'user-2' },
    });
    expect(prisma.goal.deleteMany).toHaveBeenCalledWith({
      where: { accountId: 'account-1' },
    });
    expect(discord.notifySession).toHaveBeenCalledTimes(1);
  });

  it('links the account first when nobody holds it yet', async () => {
    const { service, prisma, accounts } = build(null);

    await service.confirm('user-2');

    expect(accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2', summoner: 'Owner' }),
    );
    expect(prisma.lolAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'new-account' } }),
    );
  });
});
