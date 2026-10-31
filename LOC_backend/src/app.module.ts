import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/accounts.module';
import { ClerkAuthGuard } from './auth/clerk-auth.guard';
import { ChampionGuidesModule } from './champion-guides/champion-guides.module';
import { ChampionPoolsModule } from './champion-pools/champion-pools.module';
import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_MESSAGE,
  RATE_LIMIT_WINDOW_MS,
} from './common/rate-limit';
import { AppExceptionFilter } from './discord/app-exception.filter';
import { DiscordModule } from './discord/discord.module';
import { FeedbackModule } from './feedback/feedback.module';
import { GoalsModule } from './goals/goals.module';
import { LearningModule } from './learning/learning.module';
import { MatchesModule } from './matches/matches.module';
import { PrismaModule } from './prisma/prisma.module';
import { RiotModule } from './riot/riot.module';
import { SocialModule } from './social/social.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        { ttl: RATE_LIMIT_WINDOW_MS, limit: RATE_LIMIT_MAX_REQUESTS },
      ],
      errorMessage: RATE_LIMIT_MESSAGE,
    }),
    DiscordModule,
    PrismaModule,
    UsersModule,
    SocialModule,
    RiotModule,
    AccountsModule,
    FeedbackModule,
    GoalsModule,
    LearningModule,
    ChampionGuidesModule,
    ChampionPoolsModule,
    MatchesModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    // Global guards run in this order: the cheap throttle check first, so a
    // flood is rejected before any Clerk token gets verified.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ClerkAuthGuard },
  ],
})
export class AppModule {}
