import { Body, Controller, Get, Headers, Post, Query, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';

const RegisterSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: { name: string; email: string; password: string },
  ) {
    return this.authService.register(body.name, body.email, body.password);
  }

  @Post('login')
  login(
    @Body(new ZodValidationPipe(LoginSchema)) body: { email: string; password: string },
  ) {
    return this.authService.login(body.email, body.password);
  }

  @Get('riot/authorize')
  getRiotAuthorizationUrl(@Headers('authorization') authorization?: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token JWT para iniciar la vinculación con Riot.');
    }

    const token = authorization.replace(/^Bearer\s+/i, '');
    const payload = verify(token, process.env.JWT_SECRET ?? 'leagueofcoach-secret') as { sub?: string };
    const userId = payload.sub;

    if (!userId) {
      throw new UnauthorizedException('El token JWT no contiene un usuario válido.');
    }

    return {
      url: this.authService.getRiotAuthorizationUrl(userId),
      userId,
    };
  }

  @Get('riot/callback')
  completeRiotCallback(@Query('code') code: string, @Query('state') state: string) {
    return this.authService.handleRiotCallback(code, state);
  }
}
