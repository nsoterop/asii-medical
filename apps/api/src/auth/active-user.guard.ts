import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from './supabase-auth.guard';
import { UserStatus } from '@prisma/client';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new ForbiddenException('Missing user');
    }
    if (request.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account pending approval');
    }
    return true;
  }
}
