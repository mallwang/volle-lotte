/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { existsSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { defaultRules, warmUp } from 'game-rules';
import { AppModule } from './app/app.module';
import { serveFrontend } from './serve-frontend';

async function bootstrap() {
  // Local development: read .env if present (containers set real environment variables).
  if (existsSync('.env')) process.loadEnvFile('.env');
  warmUp(defaultRules());
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  serveFrontend(app);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

void bootstrap();
