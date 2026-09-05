import { Module } from '@nestjs/common';
import { ChampionDataService } from './champion-data.service';
import { PuuidRefreshService } from './puuid-refresh.service';
import { RiotApiService } from './riot-api.service';

@Module({
  providers: [RiotApiService, ChampionDataService, PuuidRefreshService],
  exports: [RiotApiService, ChampionDataService, PuuidRefreshService],
})
export class RiotModule {}
