import { AuthzService } from './authz.service';

describe('AuthzService verification checks', () => {
  function build(account: unknown) {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) },
      lolAccount: {
        findUnique: jest.fn().mockResolvedValue(account),
        findFirst: jest.fn().mockResolvedValue(account),
      },
    };
    return new AuthzService(prisma as never);
  }

  it('lets the owner of a verified account through', async () => {
    const authz = build({ userId: 'user-1', verifiedAt: new Date() });

    await expect(
      authz.assertVerifiedAccount('account-1', 'clerk-1'),
    ).resolves.toBeUndefined();
  });

  it('blocks an unverified account with a code the client can read', async () => {
    const authz = build({ userId: 'user-1', verifiedAt: null });

    await expect(
      authz.assertVerifiedAccount('account-1', 'clerk-1'),
    ).rejects.toMatchObject({ response: { code: 'ACCOUNT_NOT_VERIFIED' } });
  });

  it('does not reveal the verification state of somebody else’s account', async () => {
    const authz = build({ userId: 'user-2', verifiedAt: null });

    await expect(
      authz.assertVerifiedAccount('account-1', 'clerk-1'),
    ).rejects.toThrow('No tienes acceso a esta cuenta.');
  });

  it('blocks a user with no verified account at all', async () => {
    const authz = build(null);

    await expect(
      authz.assertHasVerifiedAccount('user-1'),
    ).rejects.toMatchObject({ response: { code: 'ACCOUNT_NOT_VERIFIED' } });
  });
});
