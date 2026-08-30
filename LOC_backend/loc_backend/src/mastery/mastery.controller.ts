import { Controller, Get, Param } from '@nestjs/common';
import { MasteryService } from './mastery.service';

@Controller('mastery')
export class MasteryController {
  constructor(private readonly masteryService: MasteryService) {}

  @Get('account/:accountId')
  getForAccount(@Param('accountId') accountId: string) {
    return this.masteryService.getForAccount(accountId);
  }
}
