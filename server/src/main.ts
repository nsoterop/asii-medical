import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { INestApplication } from '@nestjs/common';

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: ${await app.getUrl()}/api`);
}
bootstrap().catch((e) => console.log(e));
