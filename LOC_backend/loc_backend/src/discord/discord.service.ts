import { Injectable, Logger } from '@nestjs/common';

type DiscordChannel = 'session' | 'issues' | 'deploys';

const WEBHOOK_ENV_VAR: Record<DiscordChannel, string> = {
  session: 'DISCORD_SESSION_WEBHOOK_URL',
  issues: 'DISCORD_ISSUES_WEBHOOK_URL',
  deploys: 'DISCORD_DEPLOYS_WEBHOOK_URL',
};

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly lastSentAt = new Map<string, number>();

  notifySession(content: string) {
    void this.send('session', content);
  }

  notifyIssue(content: string) {
    void this.send('issues', content);
  }

  notifyDeploy(content: string) {
    void this.send('deploys', content);
  }

  /** Same as notifyIssue, but skips sending if the same `key` fired within `cooldownMs` — keeps a flapping dependency (e.g. an expired Riot key) from flooding the channel. */
  notifyIssueThrottled(key: string, content: string, cooldownMs = 5 * 60 * 1000) {
    const now = Date.now();
    const last = this.lastSentAt.get(key) ?? 0;
    if (now - last < cooldownMs) return;

    this.lastSentAt.set(key, now);
    this.notifyIssue(content);
  }

  private async send(channel: DiscordChannel, content: string) {
    const webhookUrl = process.env[WEBHOOK_ENV_VAR[channel]];
    if (!webhookUrl) return;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Discord webhook (${channel}) respondió ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo notificar a Discord (${channel}): ${(error as Error).message}`,
      );
    }
  }
}
