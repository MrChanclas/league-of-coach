import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StatsModule } from '../stats/stats.module';
import { BehaviorFlagsService } from './behavior-flags.service';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { LessonsService } from './lessons.service';

@Module({
  imports: [StatsModule, AuthModule],
  controllers: [LearningController],
  providers: [LearningService, LessonsService, BehaviorFlagsService],
  exports: [LearningService, BehaviorFlagsService],
})
export class LearningModule {}
