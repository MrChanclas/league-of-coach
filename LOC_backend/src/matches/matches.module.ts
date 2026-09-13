import { Module } from '@nestjs/common';
import { RiotModule } from '../riot/riot.module';
import { AuthModule } from '../auth/auth.module';
import { RankSnapshotsModule } from '../rank-snapshots/rank-snapshots.module';
import { BackfillPollerService } from './backfill-poller.service';
import { MatchesController } from './matches.controller';
import { MatchesInternalController } from './matches-internal.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [RiotModule, RankSnapshotsModule, AuthModule],
  controllers: [MatchesController, MatchesInternalController],
  providers: [MatchesService, BackfillPollerService],
  exports: [MatchesService],
})
export class MatchesModule {}
