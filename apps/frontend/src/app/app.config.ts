import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { TerracottaPreset } from './theme/terracotta-preset';

/** `license` is fetched from the backend at runtime (PRIMENG_LICENSE), so no key is baked into the bundle. */
export const appConfig = (license?: string): ApplicationConfig => ({
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    providePrimeNG({
      license,
      theme: {
        preset: TerracottaPreset,
        options: { prefix: 'p', darkModeSelector: '.app-dark', cssLayer: false },
      },
    }),
    MessageService,
  ],
});
