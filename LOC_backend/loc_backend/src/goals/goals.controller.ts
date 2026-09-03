import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { GoalsService } from './goals.service';

const CreateGoalSchema = z.object({
  type: z.enum(['rank', 'role', 'champion', 'general']),
  title: z.string().min(2).max(120),
  progress: z.number().int().min(0).max(100),
  deadline: z.coerce.date().optional(),
  accountId: z.string().min(1),
});

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateGoalSchema))
    body: z.infer<typeof CreateGoalSchema>,
  ) {
    return this.goalsService.create(body);
  }

  @Get('account/:accountId')
  listByAccount(@Param('accountId') accountId: string) {
    return this.goalsService.listByAccount(accountId);
  }
}
