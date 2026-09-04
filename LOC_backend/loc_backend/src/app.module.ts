import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/accounts.module';
import { ClerkAuthGuard } from './auth/clerk-auth.guard';
import { AppExceptionFilter } from './discord/app-exception.filter';
import { DiscordModule } from './discord/discord.module';
import { FeedbackModule } from './feedback/feedback.module';
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
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DiscordModule,
    PrismaModule,
    UsersModule,
    RiotModule,
    AccountsModule,
    FeedbackModule,
    GoalsModule,
    LearningModule,
    MatchesModule,
    MasteryModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_GUARD, useClass: ClerkAuthGuard },
  ],
})
export class AppModule {}
