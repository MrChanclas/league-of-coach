import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';

const COOLDOWN_MS = 60 * 1000;

@Injectable()
export class FeedbackService {
  private readonly lastSubmittedAt = new Map<string, number>();

  constructor(private readonly discord: DiscordService) {}

  async submitFeedback(message: string, email: string, ip: string) {
    const now = Date.now();
    const last = this.lastSubmittedAt.get(ip) ?? 0;
    if (now - last < COOLDOWN_MS) {
      throw new HttpException(
        'Ya enviaste feedback hace poco, espera un momento antes de enviar otro.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Contact first: if the message gets cut to Discord's limit, the way to
    // answer it survives. Awaited because Cloud Run freezes the CPU once the
    // response is out, and the user has to know if it didn't arrive.
    const delivered = await this.discord.notifyFeedback(
      `📝 **Nuevo feedback (login)** — contacto: ${email}\n${message}`,
    );
    if (!delivered) {
      throw new ServiceUnavailableException(
        'No pudimos recibir tu mensaje. Inténtalo de nuevo en un momento.',
      );
    }

    for (const [key, sentAt] of this.lastSubmittedAt) {
      if (now - sentAt >= COOLDOWN_MS) this.lastSubmittedAt.delete(key);
    }
    this.lastSubmittedAt.set(ip, now);
  }
}
