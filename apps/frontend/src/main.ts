import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/** Runtime config served by the backend; an unreachable backend just means no license key. */
const license = await fetch('/api/config')
  .then((r) => r.json() as Promise<{ primengLicense?: string }>)
  .then((c) => c.primengLicense)
  .catch(() => undefined);

bootstrapApplication(App, appConfig(license)).catch((err) => console.error(err));
