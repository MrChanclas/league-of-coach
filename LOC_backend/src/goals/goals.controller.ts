import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { CreateGoalSchema, GoalsService, type CreateGoalInput } from './goals.service';

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
    body: CreateGoalInput,
  ) {
    await this.authz.assertAccountOwnership(body.accountId, request.clerkUserId);
    return this.goalsService.create(body);
  }

  @Get('account/:accountId')
  async listByAccount(@Req() request: AuthenticatedRequest, @Param('accountId') accountId: string) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.goalsService.listByAccount(accountId);
  }

  @Delete(':id')
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    const goal = await this.goalsService.findOneOrThrow(id);
    await this.authz.assertAccountOwnership(goal.accountId, request.clerkUserId);
    return this.goalsService.remove(id);
  }
}
