import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

// The admin account lives outside Clerk: one username and a scrypt hash of
// its password, both kept in Secret Manager (never in this public repo).
// Hash a new password with `pnpm admin:hash-password`.

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keyLength: 64 };
// N=2^15 with r=8 needs 32 MiB; Node refuses past its 32 MiB default.
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function equalBuffers(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

// Hashing both sides first keeps the comparison length-independent.
function equalStrings(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keyLength, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: SCRYPT_MAXMEM,
  });
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

export function verifyAdminPassword(password: string, stored: string): boolean {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'base64');
  const actual = scryptSync(
    password,
    Buffer.from(salt, 'base64'),
    expected.length,
    {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT_MAXMEM,
    },
  );
  return equalBuffers(actual, expected);
}

export function verifyAdminCredentials(
  username: string,
  password: string,
  config: { username?: string; passwordHash?: string },
): boolean {
  if (!config.username || !config.passwordHash) return false;
  // Both checks always run, so a wrong username takes as long as a wrong
  // password and doesn't reveal which one failed.
  const passwordOk = verifyAdminPassword(password, config.passwordHash);
  const usernameOk = equalStrings(username, config.username);
  return usernameOk && passwordOk;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** A stateless session: rotating ADMIN_SESSION_SECRET signs every admin out. */
export function issueAdminToken(secret: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: 'admin', exp: now + ADMIN_SESSION_TTL_MS }),
  ).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyAdminToken(
  token: string,
  secret: string,
  now = Date.now(),
): boolean {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  if (
    !equalBuffers(Buffer.from(signature), Buffer.from(sign(payload, secret)))
  ) {
    return false;
  }

  try {
    const { sub, exp } = JSON.parse(
      Buffer.from(payload, 'base64url').toString(),
    ) as { sub?: unknown; exp?: unknown };
    return sub === 'admin' && typeof exp === 'number' && exp > now;
  } catch {
    return false;
  }
}
