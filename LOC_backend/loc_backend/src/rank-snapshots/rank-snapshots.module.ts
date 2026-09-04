import { Module } from '@nestjs/common';
import { RankSnapshotsService } from './rank-snapshots.service';

@Module({
  providers: [RankSnapshotsService],
  exports: [RankSnapshotsService],
})
export class RankSnapshotsModule {}
