import { Test } from '@nestjs/testing';
import type IORedis from 'ioredis';
import type { Queue } from 'bullmq';

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn(),
}));

describe('QueuesModule', () => {
  const originalRedisUrl = process.env.REDIS_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.REDIS_URL = 'redis://unit-test:6379';
  });

  afterEach(() => {
    if (originalRedisUrl) {
      process.env.REDIS_URL = originalRedisUrl;
    } else {
      delete process.env.REDIS_URL;
    }
    if (originalNodeEnv) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  it('constructs the Redis connection with REDIS_URL', async () => {
    const redisInstance = { ping: jest.fn() };
    const IORedisMock = (await import('ioredis')).default as unknown as jest.Mock;
    IORedisMock.mockImplementation(() => redisInstance as unknown as IORedis);

    const QueueMock = (await import('bullmq')).Queue as unknown as jest.Mock;
    QueueMock.mockImplementation(() => ({}) as Queue);

    const { QueuesModule } = await import('../src/queues/queues.module');
    const { IMPORTS_QUEUE, IMPORTS_QUEUE_NAME } = await import('../src/queues/queues.constants');

    const moduleRef = await Test.createTestingModule({
      imports: [QueuesModule],
    }).compile();

    moduleRef.get(IMPORTS_QUEUE);

    expect(IORedisMock).toHaveBeenCalledWith(
      'redis://unit-test:6379',
      expect.objectContaining({ maxRetriesPerRequest: null }),
    );
    expect(QueueMock).toHaveBeenCalledWith(IMPORTS_QUEUE_NAME, {
      connection: redisInstance,
    });
  });
});
