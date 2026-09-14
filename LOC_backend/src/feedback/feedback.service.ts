import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';

const COOLDOWN_MS = 60 * 1000;

@Injectable()
export class FeedbackService {
  private readonly lastSubmittedAt = new Map<string, number>();

  constructor(private readonly discord: DiscordService) {}

  submitFeedback(message: string, email: string, ip: string) {
    const now = Date.now();
    const last = this.lastSubmittedAt.get(ip) ?? 0;
    if (now - last < COOLDOWN_MS) {
      throw new HttpException(
        'Ya enviaste feedback hace poco, espera un momento antes de enviar otro.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.lastSubmittedAt.set(ip, now);

    this.discord.notifyFeedback(
      `📝 **Nuevo feedback (login)**\n${message}\n— contacto: ${email}`,
    );
  }
}
