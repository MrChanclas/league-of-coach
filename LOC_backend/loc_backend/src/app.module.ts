import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/accounts.module';
import { ClerkAuthGuard } from './auth/clerk-auth.guard';
import { GoalsModule } from './goals/goals.module';
import { LearningModule } from './learning/learning.module';
import { MasteryModule } from './mastery/mastery.module';
import { MatchesModule } from './matches/matches.module';
import { PrismaModule } from './prisma/prisma.module';
import { RiotModule } from './riot/riot.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    RiotModule,
    AccountsModule,
    GoalsModule,
    LearningModule,
    MatchesModule,
    MasteryModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ClerkAuthGuard }],
})
export class AppModule {}
