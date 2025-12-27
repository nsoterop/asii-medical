import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt
    };
  }
}
