import '../prisma/load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { getApiRuntimeConfig } from './common/config/runtime-env';

async function bootstrap() {
  const runtimeConfig = getApiRuntimeConfig();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();
  app.enableCors({
    origin:
      runtimeConfig.corsAllowedOrigins.length > 0
        ? runtimeConfig.corsAllowedOrigins
        : false,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(runtimeConfig.port);
}

void bootstrap();
