import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  AddPoolEntrySchema,
  ChampionPoolsService,
  ReplacePoolSchema,
  UpdatePoolEntrySchema,
  type AddPoolEntryInput,
  type ReplacePoolInput,
  type UpdatePoolEntryInput,
} from './champion-pools.service';
import { isPoolSlotKey, type PoolSlotKey } from './pool-roles';

// A champion can sit in several lines, so an entry is addressed by champion
// and slot together.
function parseSlot(slot: string): PoolSlotKey {
  if (!isPoolSlotKey(slot)) {
    throw new BadRequestException(`"${slot}" no es una línea del pool.`);
  }
  return slot;
}

@Controller('champion-pools')
export class ChampionPoolsController {
  constructor(
    private readonly championPoolsService: ChampionPoolsService,
    private readonly authz: AuthzService,
  ) {}

  /** Full champion roster for the selector grid — not account-scoped. */
  @Get('roster')
  async getRoster() {
    return this.championPoolsService.getRoster();
  }

  @Get('account/:accountId')
  async getPool(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.championPoolsService.getPoolView(accountId);
  }

  @Get('account/:accountId/recommendation')
  async getRecommendation(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.championPoolsService.getRecommendation(accountId);
  }

  @Put('account/:accountId')
  async replacePool(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(ReplacePoolSchema)) body: ReplacePoolInput,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.championPoolsService.replacePool(accountId, body);
  }

  @Post('account/:accountId/entries')
  async addEntry(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(AddPoolEntrySchema)) body: AddPoolEntryInput,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.championPoolsService.addEntry(accountId, body);
  }

  @Patch('account/:accountId/entries/:championKey/:slot')
  async updateEntry(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Param('championKey') championKey: string,
    @Param('slot') slot: string,
    @Body(new ZodValidationPipe(UpdatePoolEntrySchema))
    body: UpdatePoolEntryInput,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.championPoolsService.updateEntry(
      accountId,
      championKey,
      parseSlot(slot),
      body,
    );
  }

  @Delete('account/:accountId/entries/:championKey/:slot')
  async removeEntry(
    @Req() request: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Param('championKey') championKey: string,
    @Param('slot') slot: string,
  ) {
    await this.authz.assertAccountOwnership(accountId, request.clerkUserId);
    return this.championPoolsService.removeEntry(
      accountId,
      championKey,
      parseSlot(slot),
    );
  }
}
