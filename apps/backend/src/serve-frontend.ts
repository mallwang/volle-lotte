import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

const noCache = (res: Response) => res.setHeader('Cache-Control', 'no-cache');

/** Serve one Angular build (optionally under a URL prefix) with SPA fallback. */
function serveSpa(app: NestExpressApplication, root: string, prefix: string) {
  const index = join(root, 'index.html');
  app.useStaticAssets(root, {
    prefix,
    index: false,
    setHeaders: (res, path) => {
      // Hashed assets are immutable; entry points must always revalidate.
      if (/(index\.html|ngsw\.json|ngsw-worker\.js)$/.test(path)) noCache(res);
      else if (/-[A-Z0-9]{8}\.(js|css)$/.test(path))
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const inScope = prefix ? req.path === prefix.slice(0, -1) || req.path.startsWith(prefix) : true;
    if (
      !inScope ||
      req.method !== 'GET' ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/socket.io')
    )
      return next();
    noCache(res);
    res.sendFile(index);
  });
}

/**
 * Container: serve the desktop build (WEB_ROOT) at `/` and the mobile build (MOBILE_WEB_ROOT)
 * at `/m/`, each with SPA fallback; unset in development. Mobile is registered first so the
 * desktop catch-all never captures `/m/`.
 */
export function serveFrontend(app: NestExpressApplication) {
  const mobile = process.env['MOBILE_WEB_ROOT'];
  if (mobile) serveSpa(app, mobile, '/m/');
  const root = process.env['WEB_ROOT'];
  if (root) serveSpa(app, root, '');
}
