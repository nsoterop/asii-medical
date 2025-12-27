import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminSecretGuard } from './admin-secret.guard';
import { UserStatus } from '@prisma/client';

@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(AdminSecretGuard)
  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE }
    });
  }
}
