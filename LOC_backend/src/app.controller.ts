import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getRoot() {
    return { name: 'League of Coach API' };
  }

  @Public()
  @SkipThrottle()
  @Get('health')
  getHealth() {
    return this.appService.checkHealth();
  }
}
