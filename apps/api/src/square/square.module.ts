import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SquareService } from './square.service';
import { SquareWebhookController } from './square.webhook.controller';

@Module({
  imports: [PrismaModule],
  providers: [SquareService],
  controllers: [SquareWebhookController],
  exports: [SquareService],
})
export class SquareModule {}
