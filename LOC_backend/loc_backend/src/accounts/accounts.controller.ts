import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AccountsService } from './accounts.service';

const CreateAccountSchema = z.object({
  summoner: z.string().min(2).max(80),
  tag: z.string().min(2).max(20),
  server: z.string().min(2).max(30),
  userId: z.string().min(1),
});

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateAccountSchema))
    body: z.infer<typeof CreateAccountSchema>,
  ) {
    return this.accountsService.create(body);
  }

  @Post('search')
  search(
    @Body(new ZodValidationPipe(CreateAccountSchema))
    body: z.infer<typeof CreateAccountSchema>,
  ) {
    return this.accountsService.search(body);
  }

  @Get('user/:userId')
  listByUser(@Param('userId') userId: string) {
    return this.accountsService.listByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }
}
