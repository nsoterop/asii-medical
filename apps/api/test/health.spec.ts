import { Test } from '@nestjs/testing';
import { HealthController } from '../src/health.controller';
import { REDIS_CONNECTION } from '../src/queues/queues.constants';

describe('HealthController', () => {
  it('/health (GET)', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: REDIS_CONNECTION,
          useValue: {
            ping: jest.fn().mockResolvedValue('PONG'),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const result = await controller.getHealth();
    expect(result.ok).toBe(true);
    expect(typeof result.redis).toBe('boolean');
    expect(typeof result.meili).toBe('boolean');
  });
});
