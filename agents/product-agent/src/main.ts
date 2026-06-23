import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 8101);
  await app.listen(port);
  Logger.log(`product-agent listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
