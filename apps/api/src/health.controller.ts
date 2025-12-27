import { Controller, Get } from '@nestjs/common';
import { HealthStatus } from '@asii/shared';

@Controller()
export class HealthController {
  @Get('/health')
  getHealth(): HealthStatus {
    return { ok: true };
  }
}
