import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController, AdminUsersController],
  providers: [SupabaseAuthGuard],
  exports: [SupabaseAuthGuard]
})
export class AuthModule {}
