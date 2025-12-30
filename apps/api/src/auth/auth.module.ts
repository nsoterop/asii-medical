import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { AdminUsersController } from './admin-users.controller';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController, AdminUsersController],
  providers: [SupabaseAuthGuard, AdminGuard],
  exports: [SupabaseAuthGuard, AdminGuard],
})
export class AuthModule {}
