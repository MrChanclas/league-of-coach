import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { LearningService } from './learning.service';
import { LessonsService } from './lessons.service';

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
  constructor(
    private readonly learningService: LearningService,
    private readonly lessonsService: LessonsService,
    private readonly authz: AuthzService,
  ) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateLearningSchema))
    body: z.infer<typeof CreateLearningSchema>,
  ) {
    await this.authz.assertAccountOwnership(body.accountId, request.clerkUserId);
    return this.learningService.create(body);
  }

  @Get('account/:accountId')
  async listByAccount(@Req() request: AuthenticatedRequest, @Param('accountId') accountId: string) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.learningService.listByAccount(accountId);
  }

  @Get('account/:accountId/lessons')
  async getLessons(@Req() request: AuthenticatedRequest, @Param('accountId') accountId: string) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.lessonsService.generateForAccount(accountId);
  }
}
