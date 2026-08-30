import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const GoalSchema = z.object({
  type: z.enum(['rank', 'role', 'champion', 'general']),
  title: z.string().min(2).max(120),
  progress: z.number().int().min(0).max(100),
  deadline: z.coerce.date().optional(),
  accountId: z.string().min(1),
});

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: z.infer<typeof GoalSchema>) {
    return this.prisma.goal.create({
      data: GoalSchema.parse(input),
    });
  }

  async listByAccount(accountId: string) {
    return this.prisma.goal.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
