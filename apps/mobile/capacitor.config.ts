import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'family.allwang.vollelotte.mobile',
  appName: 'Volle Lotte',
  // Relative-base build (`nx run mobile:build:capacitor`), not the `/m/` browser build.
  webDir: '../../dist/apps/mobile-capacitor/browser',
};

export default config;
