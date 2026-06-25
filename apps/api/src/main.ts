import '../prisma/load-env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from './app.module';
import { getApiRuntimeConfig } from './common/config/runtime-env';

const expressServer = express();
let appBootstrapPromise: Promise<void> | null = null;

async function configureApp() {
  const runtimeConfig = getApiRuntimeConfig();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressServer));

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

  return { app, runtimeConfig };
}

async function ensureAppInitialized() {
  if (!appBootstrapPromise) {
    appBootstrapPromise = (async () => {
      const { app } = await configureApp();
      await app.init();
    })();
  }

  await appBootstrapPromise;
}

async function bootstrap() {
  const { app, runtimeConfig } = await configureApp();
  await app.listen(runtimeConfig.port);
}

async function handler(request: Request, response: Response) {
  await ensureAppInitialized();
  expressServer(request, response);
}

module.exports = handler;
module.exports.default = handler;

if (process.env.VERCEL !== '1') {
  void bootstrap();
}
