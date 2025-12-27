import { Provider } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { IMPORTS_QUEUE, IMPORTS_QUEUE_NAME } from './imports.constants';

export const importsQueueProvider: Provider = {
  provide: IMPORTS_QUEUE,
  useFactory: () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    return new Queue(IMPORTS_QUEUE_NAME, { connection });
  }
};
