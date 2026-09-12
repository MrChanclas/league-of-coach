import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { ChampionGuidesService } from './champion-guides.service';

@Controller('champion-guides')
export class ChampionGuidesController {
  constructor(
    private readonly championGuidesService: ChampionGuidesService,
    private readonly authz: AuthzService,
  ) {}

  @Get(':champion')
  async getGuide(
    @Req() request: AuthenticatedRequest,
    @Param('champion') champion: string,
    @Query('accountId') accountId?: string,
  ) {
    if (accountId) {
      await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    }
    return this.championGuidesService.getGuide(champion, accountId);
  }
}
