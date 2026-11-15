import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// The subset of pg's PoolConfig this service sets (pg ships no types of its
// own, and @types/pg is not a direct dependency).
export interface DbPoolConfig {
  connectionString?: string;
  max: number;
  connectionTimeoutMillis: number;
  ssl?: { ca: string; rejectUnauthorized: boolean };
}

// Every Cloud Run instance opens its own pool against Supabase's pooler
// (Supavisor, transaction mode), which takes up to 200 client connections on
// the free plan and multiplexes them onto a much smaller set of real Postgres
// connections. Instances cold starting together each fill their pool, so the
// pool size times the service's --max-instances in the deploy workflow has to
// stay under that limit.
const DEFAULT_POOL_MAX = 8;

/**
 * Builds the pg pool settings from the environment.
 *
 * With DATABASE_SSL_CA set (production: Supabase's root certificate, from
 * Secret Manager), the connection is encrypted and the server certificate is
 * verified against that CA. Any `sslmode` in the URL is dropped first: pg
 * lets the URL override the `ssl` option, and it reads `sslmode=require` as
 * "verify against the system CAs", which Supabase's own CA would fail.
 *
 * Without it (local docker-compose Postgres), the URL is used as is.
 */
export function buildPoolConfig(env: NodeJS.ProcessEnv): DbPoolConfig {
  const base: DbPoolConfig = {
    connectionString: env.DATABASE_URL,
    max: Number(env.DATABASE_POOL_MAX) || DEFAULT_POOL_MAX,
    // Fail a request that can't get a connection instead of letting it
    // hang until Cloud Run's request timeout.
    connectionTimeoutMillis: 15_000,
  };

  const ca = env.DATABASE_SSL_CA?.trim();
  if (!ca || !env.DATABASE_URL) return base;

  const url = new URL(env.DATABASE_URL);
  url.searchParams.delete('sslmode');
  return {
    ...base,
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true },
  };
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter: new PrismaPg(buildPoolConfig(process.env)) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
