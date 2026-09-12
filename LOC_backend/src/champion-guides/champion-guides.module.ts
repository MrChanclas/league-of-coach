import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LearningModule } from '../learning/learning.module';
import { ChampionGuidesController } from './champion-guides.controller';
import { ChampionGuidesService } from './champion-guides.service';
import { DataDragonService } from './data-dragon.service';

@Module({
  imports: [AuthModule, LearningModule],
  controllers: [ChampionGuidesController],
  providers: [ChampionGuidesService, DataDragonService],
  exports: [DataDragonService],
})
export class ChampionGuidesModule {}
