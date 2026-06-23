import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  readiness() {
    return {
      service: 'devops-agent',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
