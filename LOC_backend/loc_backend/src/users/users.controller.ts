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
import type { AuthenticatedRequest } from '../auth/clerk-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateUserSchema)) createUserDto: CreateUserDto,
  ) {
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
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string) {
    return this.usersService.getUserDashboard(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
