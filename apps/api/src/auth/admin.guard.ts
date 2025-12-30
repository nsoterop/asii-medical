import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from './supabase-auth.guard';

type AdminRow = { is_admin: boolean | null };

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const supabaseUserId = request.auth?.supabaseUserId;

    if (!supabaseUserId) {
      throw new UnauthorizedException('Missing auth context');
    }

    const rows = await this.prisma.$queryRaw<AdminRow[]>`
      SELECT is_admin
      FROM public.profiles
      WHERE id = ${supabaseUserId}::uuid
      LIMIT 1
    `;

    const isAdmin = rows[0]?.is_admin === true;
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
