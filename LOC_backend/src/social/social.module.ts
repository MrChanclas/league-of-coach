import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DuoChatService } from './duo-chat.service';
import { DuoProfilesService } from './duo-profiles.service';
import { DuoRequestsService } from './duo-requests.service';
import { DuosService } from './duos.service';
import { SocialController } from './social.controller';

@Module({
  imports: [AuthModule],
  controllers: [SocialController],
  providers: [
    DuoProfilesService,
    DuoRequestsService,
    DuosService,
    DuoChatService,
  ],
})
export class SocialModule {}
