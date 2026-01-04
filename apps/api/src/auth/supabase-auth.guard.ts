import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { verifySupabaseJwt } from './supabase-jwt';
import { User, UserStatus } from '@prisma/client';

export type SupabaseAuthContext = {
  supabaseUserId: string;
  email: string | null;
};

export type AuthenticatedRequest = Request & {
  auth?: SupabaseAuthContext;
  user?: User;
};

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const logger = new Logger(SupabaseAuthGuard.name);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      logger.warn('Missing bearer token');
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      logger.warn('Empty bearer token');
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await verifySupabaseJwt(token);
      request.auth = { supabaseUserId: payload.sub, email: payload.email };

      const existing = await this.prisma.user.findUnique({
        where: { supabaseUserId: payload.sub },
      });

      if (!existing) {
        const created = await this.prisma.user.create({
          data: {
            supabaseUserId: payload.sub,
            email: payload.email ?? `user_${payload.sub}@example.com`,
            status: UserStatus.PENDING_REVIEW,
          },
        });
        request.user = created;
      } else if (payload.email && existing.email !== payload.email) {
        const updated = await this.prisma.user.update({
          where: { id: existing.id },
          data: { email: payload.email },
        });
        request.user = updated;
      } else {
        request.user = existing;
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`JWT verification failed: ${message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
