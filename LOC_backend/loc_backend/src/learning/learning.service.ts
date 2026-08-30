import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const LearningSchema = z.object({
  champion: z.string().min(2).max(80),
  role: z.string().min(2).max(40),
  games: z.number().int().min(0),
  wins: z.number().int().min(0),
  kdaK: z.number().min(0),
  kdaD: z.number().min(0),
  kdaA: z.number().min(0),
  csMin: z.number().min(0),
  accountId: z.string().min(1),
});

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: z.infer<typeof LearningSchema>) {
    return this.prisma.championLearning.create({
      data: LearningSchema.parse(input),
    });
  }

  async listByAccount(accountId: string) {
    return this.prisma.championLearning.findMany({
      where: { accountId },
      include: { sessions: true },
    });
  }
}
