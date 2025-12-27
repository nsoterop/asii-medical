import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.ADMIN_SHARED_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Admin secret not configured');
    }

    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-admin-secret'];

    if (!provided || provided !== secret) {
      throw new UnauthorizedException('Invalid admin secret');
    }

    return true;
  }
}
