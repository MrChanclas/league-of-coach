import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from '../auth/public.decorator';
import { FeedbackService } from './feedback.service';

const FeedbackSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  email: z.string().trim().email().optional().or(z.literal('')),
});

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Public()
  @Post()
  submitFeedback(
    @Req() request: Request,
    @Body(new ZodValidationPipe(FeedbackSchema))
    body: z.infer<typeof FeedbackSchema>,
  ) {
    const ip = request.ip ?? 'unknown';
    this.feedbackService.submitFeedback(body.message, body.email || undefined, ip);
    return { ok: true };
  }
}
