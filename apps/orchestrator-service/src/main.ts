import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('OrchestratorService');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3096;
  await app.listen(port);
  logger.log(`Orchestration Control Plane running on: http://localhost:${port}`);
}
bootstrap();
