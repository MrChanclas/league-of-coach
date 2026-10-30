import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

export const INTERNAL_SECRET_HEADER = 'x-internal-secret';

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  // timingSafeEqual throws on different lengths, and a length mismatch can't
  // be a match anyway.
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

/**
 * Guards the endpoints Cloud Scheduler calls in production. They are not
 * user-facing, so instead of a Clerk session they require the shared secret
 * in INTERNAL_POLL_SECRET. Pair it with @Public() so the global Clerk guard
 * lets the request reach this one.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = process.env.INTERNAL_POLL_SECRET;
    const providedSecret = context
      .switchToHttp()
      .getRequest<Request>()
      .header(INTERNAL_SECRET_HEADER);

    if (
      !expectedSecret ||
      !providedSecret ||
      !secretsMatch(providedSecret, expectedSecret)
    ) {
      throw new ForbiddenException(
        'Secreto interno inválido o no configurado.',
      );
    }

    return true;
  }
}
