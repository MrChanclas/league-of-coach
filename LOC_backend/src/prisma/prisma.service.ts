import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Every Cloud Run instance opens its own pool, and the production database
// (Cloud SQL db-f1-micro) only takes 25 connections in total, some of them
// reserved. pg's default of 10 per pool lets a handful of instances cold
// starting together exhaust it, so the pool size times the service's
// --max-instances in the deploy workflow has to stay under that limit.
const DEFAULT_POOL_MAX = 4;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX) || DEFAULT_POOL_MAX,
      // Fail a request that can't get a connection instead of letting it
      // hang until Cloud Run's request timeout.
      connectionTimeoutMillis: 15_000,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
