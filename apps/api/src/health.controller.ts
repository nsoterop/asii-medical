import { Controller, Get } from '@nestjs/common';
import IORedis from 'ioredis';
import { HealthStatus } from '@asii/shared';

@Controller()
export class HealthController {
  @Get('/health')
  async getHealth(): Promise<HealthStatus> {
    const [redis, meili] = await Promise.all([this.checkRedis(), this.checkMeili()]);
    return { ok: true, redis, meili };
  }

  private async checkRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return false;
    }

    const client = new IORedis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    try {
      await client.ping();
      return true;
    } catch {
      return false;
    } finally {
      client.disconnect();
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
