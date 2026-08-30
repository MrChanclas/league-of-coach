import { Module } from '@nestjs/common';
import { RiotModule } from '../riot/riot.module';
import { MasteryController } from './mastery.controller';
import { MasteryService } from './mastery.service';

@Module({
  imports: [RiotModule],
  controllers: [MasteryController],
  providers: [MasteryService],
})
export class MasteryModule {}
