import { Module } from '@nestjs/common';
import { AgentsController } from './agents/agents.controller';
import { AnalyticsController } from './analytics/analytics.controller';
import { HealthController } from './health/health.controller';
import { NotificationsController } from './notifications/notifications.controller';

@Module({
  controllers: [AgentsController, AnalyticsController, HealthController, NotificationsController],
})
export class AppModule {}
