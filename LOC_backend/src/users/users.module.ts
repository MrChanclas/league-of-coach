import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goals/goals.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [AuthModule, GoalsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
