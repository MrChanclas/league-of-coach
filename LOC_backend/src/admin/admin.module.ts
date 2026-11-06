import { Module } from '@nestjs/common';
import { ModerationModule } from '../moderation/moderation.module';
import { AdminAuthController, AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ModerationModule],
  controllers: [AdminAuthController, AdminController],
  providers: [AdminService],
})
export class AdminModule {}
