import { Module } from '@nestjs/common';
import { RiotModule } from '../riot/riot.module';
import { AuthModule } from '../auth/auth.module';
import { RankSnapshotsModule } from '../rank-snapshots/rank-snapshots.module';
import { AccountVerificationService } from './account-verification.service';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [RiotModule, RankSnapshotsModule, AuthModule],
  controllers: [AccountsController],
  providers: [AccountsService, AccountVerificationService],
  exports: [AccountsService],
})
export class AccountsModule {}
