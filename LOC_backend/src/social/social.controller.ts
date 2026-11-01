import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DuoChatService } from './duo-chat.service';
import { DuoProfilesService } from './duo-profiles.service';
import { DuoRequestsService } from './duo-requests.service';
import { DuosService } from './duos.service';
import {
  CreateDuoRequestSchema,
  ListDuoMessagesSchema,
  ReportDuoSchema,
  SendDuoMessageSchema,
  SetDuoGoalSchema,
  UpsertDuoProfileSchema,
  type CreateDuoRequestInput,
  type ListDuoMessagesInput,
  type ReportDuoInput,
  type SendDuoMessageInput,
  type SetDuoGoalInput,
  type UpsertDuoProfileInput,
} from './social.schemas';

// Every route acts as the signed-in user; membership of a duo or request is
// checked inside the services.
@Controller('social')
export class SocialController {
  constructor(
    private readonly authz: AuthzService,
    private readonly profiles: DuoProfilesService,
    private readonly requests: DuoRequestsService,
    private readonly duos: DuosService,
    private readonly chat: DuoChatService,
  ) {}

  private async me(request: AuthenticatedRequest) {
    const userId = await this.authz.resolveUserId(request.clerkUserId);
    await this.authz.assertHasVerifiedAccount(userId);
    return userId;
  }

  // Polled by the navigation for its badge, whatever tab or account is open.
  @Get('summary')
  async summary(@Req() request: AuthenticatedRequest) {
    return this.duos.summary(
      await this.authz.resolveUserId(request.clerkUserId),
    );
  }

  @Get('profile')
  async getProfile(@Req() request: AuthenticatedRequest) {
    return this.profiles.getMine(await this.me(request));
  }

  @Put('profile')
  async upsertProfile(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UpsertDuoProfileSchema))
    body: UpsertDuoProfileInput,
  ) {
    await this.authz.assertAccountOwnership(
      body.accountId,
      request.clerkUserId,
    );
    return this.profiles.upsert(await this.me(request), body);
  }

  @Get('candidates')
  async candidates(@Req() request: AuthenticatedRequest) {
    return this.profiles.listCandidates(await this.me(request));
  }

  @Get('requests')
  async listRequests(@Req() request: AuthenticatedRequest) {
    return this.requests.listPending(await this.me(request));
  }

  @Post('requests')
  async createRequest(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateDuoRequestSchema))
    body: CreateDuoRequestInput,
  ) {
    return this.requests.create(await this.me(request), body);
  }

  @Post('requests/:id/accept')
  async accept(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.requests.accept(await this.me(request), id);
  }

  @Post('requests/:id/decline')
  async decline(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.requests.decline(await this.me(request), id);
  }

  @Post('requests/:id/cancel')
  async cancel(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.requests.cancel(await this.me(request), id);
  }

  @Get('duos')
  async listDuos(@Req() request: AuthenticatedRequest) {
    return this.duos.listMine(await this.me(request));
  }

  @Get('duos/:id')
  async getDuo(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.duos.getDetail(await this.me(request), id);
  }

  @Put('duos/:id/goal')
  async setGoal(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetDuoGoalSchema)) body: SetDuoGoalInput,
  ) {
    return this.duos.setGoal(await this.me(request), id, body);
  }

  @Delete('duos/:id/goal')
  async removeGoal(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.duos.removeGoal(await this.me(request), id);
  }

  @Post('duos/:id/end')
  async end(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.duos.end(await this.me(request), id);
  }

  @Post('duos/:id/report')
  async report(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReportDuoSchema)) body: ReportDuoInput,
  ) {
    return this.duos.report(await this.me(request), id, body);
  }

  @Get('duos/:id/messages')
  async listMessages(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(ListDuoMessagesSchema))
    query: ListDuoMessagesInput,
  ) {
    return this.chat.list(await this.me(request), id, query.after);
  }

  @Post('duos/:id/messages')
  async sendMessage(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SendDuoMessageSchema))
    body: SendDuoMessageInput,
  ) {
    return this.chat.send(await this.me(request), id, body.body);
  }

  @Post('duos/:id/read')
  async markRead(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.chat.markRead(await this.me(request), id);
  }
}
