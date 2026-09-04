import { Module } from '@nestjs/common';
import { RiotModule } from '../riot/riot.module';
import { RankPollerService } from './rank-poller.service';
import { RankSnapshotsController } from './rank-snapshots.controller';
import { RankSnapshotsService } from './rank-snapshots.service';

@Module({
  imports: [RiotModule],
  controllers: [RankSnapshotsController],
  providers: [RankSnapshotsService, RankPollerService],
  exports: [RankSnapshotsService],
})
export class RankSnapshotsModule {}
