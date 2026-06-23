import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { EventGateway } from './gateway/event.gateway';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [EventGateway],
})
export class AppModule {}
