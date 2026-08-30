import { Module } from '@nestjs/common';
import { ChampionDataService } from './champion-data.service';
import { RiotApiService } from './riot-api.service';

@Module({
  providers: [RiotApiService, ChampionDataService],
  exports: [RiotApiService, ChampionDataService],
})
export class RiotModule {}
