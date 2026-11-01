import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  /** Fails when the database can't be reached, which is what uptime checks need to know. */
  async checkHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
