import dotenv from 'dotenv';
import path from 'path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

async function bootstrap() {
  await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn']
  });

  const logger = new Logger('WorkerBootstrap');
  logger.log('Worker started');
}

bootstrap();
