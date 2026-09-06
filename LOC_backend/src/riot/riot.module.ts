import { Module } from '@nestjs/common';
import { LeagueCutoffService } from './league-cutoff.service';
import { PuuidRefreshService } from './puuid-refresh.service';
import { RiotApiService } from './riot-api.service';

@Module({
  providers: [RiotApiService, PuuidRefreshService, LeagueCutoffService],
  exports: [RiotApiService, PuuidRefreshService, LeagueCutoffService],
})
export class RiotModule {}
