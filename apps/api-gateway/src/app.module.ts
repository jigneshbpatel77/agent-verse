import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics/analytics.controller';
import { HealthController } from './health/health.controller';
import { NotificationsController } from './notifications/notifications.controller';

@Module({
  controllers: [AnalyticsController, HealthController, NotificationsController],
})
export class AppModule {}
