import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  readiness() {
    return {
      service: 'knowledge-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
