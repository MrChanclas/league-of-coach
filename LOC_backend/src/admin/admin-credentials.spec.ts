import {
  ADMIN_SESSION_TTL_MS,
  hashAdminPassword,
  issueAdminToken,
  verifyAdminCredentials,
  verifyAdminPassword,
  verifyAdminToken,
} from './admin-credentials';

describe('admin password', () => {
  const hash = hashAdminPassword('correct horse');

  it('accepts the right password and rejects any other', () => {
    expect(verifyAdminPassword('correct horse', hash)).toBe(true);
    expect(verifyAdminPassword('correct horsE', hash)).toBe(false);
  });

  it('salts every hash', () => {
    expect(hashAdminPassword('correct horse')).not.toBe(hash);
  });

  it('rejects a malformed stored hash instead of throwing', () => {
    expect(verifyAdminPassword('x', 'not-a-hash')).toBe(false);
  });

  it('needs both the username and the password to match', () => {
    const config = { username: 'Admin', passwordHash: hash };

    expect(verifyAdminCredentials('Admin', 'correct horse', config)).toBe(true);
    expect(verifyAdminCredentials('admin', 'correct horse', config)).toBe(
      false,
    );
    expect(verifyAdminCredentials('Admin', 'wrong', config)).toBe(false);
  });

  it('refuses everyone while the credentials are not configured', () => {
    expect(verifyAdminCredentials('Admin', 'correct horse', {})).toBe(false);
  });
});

describe('admin session token', () => {
  const secret = 'test-secret';

  it('is valid until it expires', () => {
    const token = issueAdminToken(secret, 1_000);

    expect(verifyAdminToken(token, secret, 1_000)).toBe(true);
    expect(verifyAdminToken(token, secret, 1_000 + ADMIN_SESSION_TTL_MS)).toBe(
      false,
    );
  });

  it('is rejected when signed with another secret', () => {
    expect(verifyAdminToken(issueAdminToken('other'), secret)).toBe(false);
  });

  it('is rejected when its payload is edited', () => {
    const [, signature] = issueAdminToken(secret).split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'admin', exp: Date.now() * 2 }),
    ).toString('base64url');

    expect(verifyAdminToken(`${forged}.${signature}`, secret)).toBe(false);
  });
});
