import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { serveFrontend } from './serve-frontend';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { ok: true };
  }
}

@Module({ controllers: [HealthController] })
class TestModule {}

describe('serveFrontend', () => {
  let app: NestExpressApplication;
  let base: string;
  const text = (path: string) => fetch(base + path).then(async (r) => [r.status, await r.text()]);

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vl-web-'));
    const desktop = join(dir, 'desktop');
    const mobile = join(dir, 'mobile');
    mkdirSync(desktop);
    mkdirSync(mobile);
    writeFileSync(join(desktop, 'index.html'), 'DESKTOP');
    writeFileSync(join(mobile, 'index.html'), 'MOBILE');
    writeFileSync(join(mobile, 'main-ABCD1234.js'), 'js');
    process.env['WEB_ROOT'] = desktop;
    process.env['MOBILE_WEB_ROOT'] = mobile;
    app = await NestFactory.create<NestExpressApplication>(TestModule, { logger: false });
    app.setGlobalPrefix('api');
    serveFrontend(app);
    await app.listen(0);
    base = await app.getUrl();
  });

  afterAll(async () => {
    delete process.env['WEB_ROOT'];
    delete process.env['MOBILE_WEB_ROOT'];
    await app.close();
  });

  it('serves the desktop app at / and on deep links', async () => {
    expect(await text('/')).toEqual([200, 'DESKTOP']);
    expect(await text('/lobby')).toEqual([200, 'DESKTOP']);
  });

  it('serves the mobile app at /m/ and on nested routes', async () => {
    expect(await text('/m/')).toEqual([200, 'MOBILE']);
    expect(await text('/m/lobby/abc')).toEqual([200, 'MOBILE']);
  });

  it('serves mobile assets with immutable caching', async () => {
    const res = await fetch(base + '/m/main-ABCD1234.js');
    expect(await res.text()).toBe('js');
    expect(res.headers.get('cache-control')).toContain('immutable');
  });

  it('does not hand API or socket requests to either SPA', async () => {
    expect(await text('/api/health')).toEqual([200, '{"ok":true}']);
    const [status, body] = await text('/api/missing');
    expect(status).toBe(404);
    expect(body).not.toMatch(/DESKTOP|MOBILE/);
    const socket = await fetch(base + '/socket.io/?EIO=4');
    expect(await socket.text()).not.toMatch(/DESKTOP|MOBILE/);
  });
});
