import { Controller, Get, Inject } from '@nestjs/common';
import type IORedis from 'ioredis';
import { HealthStatus } from '@asii/shared';
import { REDIS_CONNECTION } from './queues/queues.constants';

@Controller()
export class HealthController {
  constructor(@Inject(REDIS_CONNECTION) private readonly redisConnection: IORedis) {}

  @Get('/health')
  async getHealth(): Promise<HealthStatus> {
    const [redis, meili] = await Promise.all([this.checkRedis(), this.checkMeili()]);
    return { ok: true, redis, meili };
  }

  private async checkRedis() {
    try {
      await this.redisConnection.ping();
      return true;
    } catch {
      return false;
    }
  }

  private async checkMeili() {
    const host = process.env.MEILI_URL || process.env.MEILISEARCH_HOST;
    if (!host) {
      return false;
    }

    const url = host.endsWith('/') ? host.slice(0, -1) : host;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);

    try {
      const response = await fetch(`${url}/health`, { signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
