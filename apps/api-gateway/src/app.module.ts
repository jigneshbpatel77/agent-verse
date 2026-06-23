import { Module } from '@nestjs/common';
import { AgentsController } from './agents/agents.controller';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [AgentsController, HealthController],
})
export class AppModule {}
