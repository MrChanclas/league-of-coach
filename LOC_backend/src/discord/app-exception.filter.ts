import { ArgumentsHost, Catch, HttpException, Injectable } from '@nestjs/common';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { DiscordService } from './discord.service';

/**
 * Extends Sentry's catch-all filter so every unhandled/5xx exception also
 * gets a one-line heads-up in #issues-logs, without duplicating Sentry's own
 * capture/response logic.
 */
@Injectable()
@Catch()
export class AppExceptionFilter extends SentryGlobalFilter {
  constructor(private readonly discord: DiscordService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    if (status >= 500) {
      const message =
        exception instanceof Error ? exception.message : String(exception);
      this.discord.notifyIssueThrottled(
        `exception:${exception instanceof Error ? exception.name : 'unknown'}`,
        `🔥 **Error 500** — ${message}`,
      );
    }

    super.catch(exception, host);
  }
}
