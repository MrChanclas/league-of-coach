import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from '../auth/public.decorator';
import { FeedbackService } from './feedback.service';

const FeedbackSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  // Obligatorio: sin un correo no hay forma de responderle a quien reporta.
  email: z.string().trim().email('Ingresa un correo válido.'),
});

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post()
  async submitFeedback(
    @Req() request: Request,
    @Body(new ZodValidationPipe(FeedbackSchema))
    body: z.infer<typeof FeedbackSchema>,
  ) {
    const ip = request.ip ?? 'unknown';
    await this.feedbackService.submitFeedback(body.message, body.email, ip);
    return { ok: true };
  }
}
