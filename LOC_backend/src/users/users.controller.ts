import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import type { CreateUserDto } from './dto/create-user.dto';
import { CreateUserSchema } from './dto/create-user.dto';
import type { ResolveMeDto } from './dto/resolve-me.dto';
import { ResolveMeSchema } from './dto/resolve-me.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserSchema } from './dto/update-user.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService } from './users.service';
import { AuthzService } from '../auth/authz.service';
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authz: AuthzService,
  ) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateUserSchema)) createUserDto: CreateUserDto,
  ) {
    await this.authz.assertAdmin(request.clerkUserId);
    return this.usersService.create(createUserDto);
  }

  @Post('me')
  resolveMe(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(ResolveMeSchema)) body: ResolveMeDto,
  ) {
    return this.usersService.findOrCreateByClerkId(
      request.clerkUserId,
      body.name,
      body.email,
    );
  }

  @Get()
  async findAll(@Req() request: AuthenticatedRequest) {
    await this.authz.assertAdmin(request.clerkUserId);
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    await this.authz.assertUserOwnership(id, request.clerkUserId);
    return this.usersService.findOne(id);
  }

  @Get(':id/dashboard')
  async getDashboard(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    await this.authz.assertUserOwnership(id, request.clerkUserId);
    return this.usersService.getUserDashboard(id);
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) updateUserDto: UpdateUserDto,
  ) {
    await this.authz.assertUserOwnership(id, request.clerkUserId);
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    await this.authz.assertUserOwnership(id, request.clerkUserId);
    return this.usersService.remove(id);
  }
}
