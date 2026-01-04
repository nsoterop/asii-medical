import { Global, Module, type Provider } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../env';
import { QUEUE_DEFINITIONS, REDIS_CONNECTION } from './queues.constants';

type RedisConnection = IORedis | NoopRedis;

const useMockQueues =
  process.env.E2E === 'true' ||
  process.env.PLAYWRIGHT === 'true' ||
  env.REDIS_URL === 'mock' ||
  env.REDIS_URL === 'memory';

class NoopRedis {
  ping() {
    return Promise.resolve('PONG');
  }
  on() {
    return this;
  }
  quit() {
    return Promise.resolve();
  }
  disconnect() {
    return undefined;
  }
}

class NoopQueue {
  constructor(public readonly name: string) {}
  add() {
    return Promise.resolve({ id: `mock-${Date.now()}` });
  }
  addBulk() {
    return Promise.resolve([]);
  }
  close() {
    return Promise.resolve();
  }
}

export const createQueueProvider = (token: string, name: string): Provider => ({
  provide: token,
  useFactory: (connection: RedisConnection) => {
    if (useMockQueues) {
      return new NoopQueue(name) as unknown as Queue;
    }
    return new Queue(name, { connection: connection as ConnectionOptions });
  },
  inject: [REDIS_CONNECTION],
});

const redisConnectionProvider: Provider = {
  provide: REDIS_CONNECTION,
  useFactory: () =>
    useMockQueues
      ? new NoopRedis()
      : new IORedis(env.REDIS_URL, {
          maxRetriesPerRequest: null,
        }),
};

const queueProviders: Provider[] = QUEUE_DEFINITIONS.map(({ token, name }) =>
  createQueueProvider(token, name),
);

@Global()
@Module({
  providers: [redisConnectionProvider, ...queueProviders],
  exports: [REDIS_CONNECTION, ...queueProviders],
})
export class QueuesModule {}
