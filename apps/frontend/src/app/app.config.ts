import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { TerracottaPreset } from './theme/terracotta-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    providePrimeNG({
      theme: {
        preset: TerracottaPreset,
        options: { prefix: 'p', darkModeSelector: '.app-dark', cssLayer: false },
      },
    }),
    MessageService,
  ],
};
