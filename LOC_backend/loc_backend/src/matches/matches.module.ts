import { Module } from '@nestjs/common';
import { RiotModule } from '../riot/riot.module';
import { AuthModule } from '../auth/auth.module';
import { RankSnapshotsModule } from '../rank-snapshots/rank-snapshots.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [RiotModule, RankSnapshotsModule, AuthModule],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
