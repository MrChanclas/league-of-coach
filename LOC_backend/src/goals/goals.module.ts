import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RiotModule } from '../riot/riot.module';
import { StatsModule } from '../stats/stats.module';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({
  imports: [AuthModule, StatsModule, RiotModule],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
