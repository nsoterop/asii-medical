import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { HealthController } from '../src/health.controller';

describe('HealthController', () => {
  it('/health (GET)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    const controller = moduleRef.get(HealthController);
    expect(controller.getHealth()).toEqual({ ok: true });
  });
});
