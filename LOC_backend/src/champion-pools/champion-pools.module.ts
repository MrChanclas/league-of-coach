import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChampionGuidesModule } from '../champion-guides/champion-guides.module';
import { StatsModule } from '../stats/stats.module';
import { ChampionPoolsController } from './champion-pools.controller';
import { ChampionPoolsService } from './champion-pools.service';
import { ChampionRosterService } from './champion-roster.service';

@Module({
  imports: [AuthModule, StatsModule, ChampionGuidesModule],
  controllers: [ChampionPoolsController],
  providers: [ChampionPoolsService, ChampionRosterService],
})
export class ChampionPoolsModule {}
