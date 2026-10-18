import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { PageTitleStrategy } from './core/page-title';
import { appRoutes } from './app.routes';
import { TerracottaPreset } from './theme/terracotta-preset';

/** `license` is fetched from the backend at runtime (PRIMENG_LICENSE), so no key is baked into the bundle. */
export const appConfig = (license?: string): ApplicationConfig => ({
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    { provide: TitleStrategy, useExisting: PageTitleStrategy },
    providePrimeNG({
      license,
      theme: {
        preset: TerracottaPreset,
        options: { prefix: 'p', darkModeSelector: '.app-dark', cssLayer: false },
      },
    }),
    MessageService,
    ConfirmationService,
  ],
});
