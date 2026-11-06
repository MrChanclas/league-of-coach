import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { Public } from '../auth/public.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DiscordService } from '../discord/discord.service';
import {
  ADMIN_SESSION_TTL_MS,
  issueAdminToken,
  verifyAdminCredentials,
} from './admin-credentials';
import { AdminSessionGuard } from './admin-session.guard';
import {
  AdminLoginSchema,
  ListDuosQuerySchema,
  ListReportsQuerySchema,
  ListUsersQuerySchema,
  ResolveReportSchema,
  type AdminLoginInput,
  type ResolveReportInput,
} from './admin.schemas';
import { AdminService } from './admin.service';

// The admin is not a Clerk user, so these routes skip the global Clerk guard.
@Public()
@Controller('admin')
export class AdminAuthController {
  constructor(private readonly discord: DiscordService) {}

  // Tight on purpose: this is the only password the site checks itself.
  @Throttle({ default: { ttl: 15 * 60_000, limit: 5 } })
  @Post('login')
  login(@Body(new ZodValidationPipe(AdminLoginSchema)) body: AdminLoginInput) {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) {
      throw new ServiceUnavailableException(
        'El acceso de admin no está configurado.',
      );
    }

    const isValid = verifyAdminCredentials(body.username, body.password, {
      username: process.env.ADMIN_USERNAME,
      passwordHash: process.env.ADMIN_PASSWORD_HASH,
    });
    if (!isValid) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    this.discord.notifySession(
      '🛡️ Alguien inició sesión en el panel de admin.',
    );
    return {
      token: issueAdminToken(secret),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
    };
  }
}

@Public()
@UseGuards(AdminSessionGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('users')
  listUsers(
    @Query(new ZodValidationPipe(ListUsersQuerySchema))
    query: z.infer<typeof ListUsersQuerySchema>,
  ) {
    return this.admin.listUsers(query.search);
  }

  @Get('users/:id/strikes')
  listUserStrikes(@Param('id') id: string) {
    return this.admin.listUserStrikes(id);
  }

  @Get('duos')
  listDuos(
    @Query(new ZodValidationPipe(ListDuosQuerySchema))
    query: z.infer<typeof ListDuosQuerySchema>,
  ) {
    return this.admin.listDuos(query.status);
  }

  @Get('reports')
  listReports(
    @Query(new ZodValidationPipe(ListReportsQuerySchema))
    query: z.infer<typeof ListReportsQuerySchema>,
  ) {
    return this.admin.listReports(query.status);
  }

  @Post('reports/:id/resolve')
  resolveReport(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ResolveReportSchema)) body: ResolveReportInput,
  ) {
    return this.admin.resolveReport(id, body);
  }

  @Post('strikes/:id/revoke')
  revokeStrike(@Param('id') id: string) {
    return this.admin.revokeStrike(id);
  }
}
