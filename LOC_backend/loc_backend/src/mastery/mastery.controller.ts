import { Controller, Get, Param, Req } from '@nestjs/common';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { MasteryService } from './mastery.service';

@Controller('mastery')
export class MasteryController {
  constructor(
    private readonly masteryService: MasteryService,
    private readonly authz: AuthzService,
  ) {}

  @Get('account/:accountId')
  async getForAccount(@Req() request: AuthenticatedRequest, @Param('accountId') accountId: string) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.masteryService.getForAccount(accountId);
  }
}
