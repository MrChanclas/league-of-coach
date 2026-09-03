import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LearningService } from './learning.service';

const CreateLearningSchema = z.object({
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

@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateLearningSchema))
    body: z.infer<typeof CreateLearningSchema>,
  ) {
    return this.learningService.create(body);
  }

  @Get('account/:accountId')
  listByAccount(@Param('accountId') accountId: string) {
    return this.learningService.listByAccount(accountId);
  }
}
