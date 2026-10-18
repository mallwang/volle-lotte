/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { defaultRules, warmUp } from 'game-rules';
import { AppModule } from './app/app.module';

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

/** Container: serve the Angular build (WEB_ROOT) with SPA fallback; unset in development. */
function serveFrontend(app: NestExpressApplication) {
  const root = process.env['WEB_ROOT'];
  if (!root) return;
  const index = join(root, 'index.html');
  const noCache = (res: Response) => res.setHeader('Cache-Control', 'no-cache');
  app.useStaticAssets(root, {
    index: false,
    setHeaders: (res, path) => {
      // Hashed assets are immutable; entry points must always revalidate.
      if (/(index\.html|ngsw\.json|ngsw-worker\.js)$/.test(path)) noCache(res);
      else if (/-[A-Z0-9]{8}\.(js|css)$/.test(path))
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io'))
      return next();
    noCache(res);
    res.sendFile(index);
  });
}

void bootstrap();
