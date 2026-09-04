import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { GoalsService } from './goals.service';

const CreateGoalSchema = z.object({
  type: z.enum(['rank', 'consistency', 'mechanic', 'habit']),
  title: z.string().min(2).max(120),
  progress: z.number().int().min(0).max(100),
  deadline: z.coerce.date().optional(),
  accountId: z.string().min(1),
});

@Controller('goals')
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly authz: AuthzService,
  ) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateGoalSchema))
    body: z.infer<typeof CreateGoalSchema>,
  ) {
    await this.authz.assertAccountOwnership(body.accountId, request.clerkUserId);
    return this.goalsService.create(body);
  }

  @Get('account/:accountId')
  async listByAccount(@Req() request: AuthenticatedRequest, @Param('accountId') accountId: string) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.goalsService.listByAccount(accountId);
  }
}
