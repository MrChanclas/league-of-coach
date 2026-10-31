import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { TwitchService } from './twitch.service';

@Controller('twitch')
export class TwitchController {
  constructor(private readonly twitchService: TwitchService) {}

  @Public()
  @Get('live')
  getLiveStatus() {
    return this.twitchService.getLiveStatus();
  }
}
