import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { verifyAdminToken } from './admin-credentials';

/**
 * Guards the admin panel's API with the session issued by POST /admin/login.
 * Pair it with @Public() so the global Clerk guard lets the request through:
 * the admin is not a Clerk user.
 */
@Injectable()
export class AdminSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.ADMIN_SESSION_SECRET;
    const header = context
      .switchToHttp()
      .getRequest<Request>()
      .header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!secret || !token || !verifyAdminToken(token, secret)) {
      throw new UnauthorizedException(
        'La sesión de admin venció. Vuelve a iniciar sesión.',
      );
    }
    return true;
  }
}
