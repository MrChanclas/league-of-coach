import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StatsModule } from '../stats/stats.module';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { LessonsService } from './lessons.service';

@Module({
  imports: [StatsModule, AuthModule],
  controllers: [LearningController],
  providers: [LearningService, LessonsService],
  exports: [LearningService],
})
export class LearningModule {}
