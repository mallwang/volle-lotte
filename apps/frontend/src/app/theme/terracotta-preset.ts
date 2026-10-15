import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Approved Warm Terracotta palette (specs/003-ui-foundation-primeng/design.md). */
const light = {
  bg: '#fbf1ea',
  surface: '#fffaf6',
  line: '#e6c3ad',
  text: '#3a241b',
  muted: '#7b5a4c',
  primary: '#a8431f',
  onPrimary: '#ffffff',
  /** Input and control outlines need 3:1 (WCAG 1.4.11). */
  control: '#957058',
  mint: ['#d3e8d6', '#1f4a2c'],
  lavender: ['#e6dcef', '#44305f'],
  butter: ['#f6e3a8', '#5a4300'],
  rose: ['#f6d0cb', '#7a2118'],
} as const;

const dark = {
  bg: '#1c1411',
  surface: '#2a1d18',
  line: '#52382c',
  text: '#f5e6dc',
  muted: '#cbaa98',
  primary: '#f08a5d',
  onPrimary: '#2a1008',
  control: '#9a7a68',
  mint: ['#244a38', '#c9f1db'],
  lavender: ['#3a3159', '#e0d8fa'],
  butter: ['#4d4018', '#ffefb0'],
  rose: ['#5a2626', '#ffd9d9'],
} as const;

/** Foreground/background token pairs checked by the contrast test (min ratio per pair). */
export const tokenPairs = (['light', 'dark'] as const).flatMap((mode) => {
  const t = mode === 'light' ? light : dark;
  const pairs: [string, string, string, number][] = [
    ['text/bg', t.text, t.bg, 4.5],
    ['text/surface', t.text, t.surface, 4.5],
    ['muted/bg', t.muted, t.bg, 4.5],
    ['muted/surface', t.muted, t.surface, 4.5],
    ['onPrimary/primary', t.onPrimary, t.primary, 4.5],
    ['primary/surface', t.primary, t.surface, 4.5],
    ['control/surface', t.control, t.surface, 3],
    ['control/bg', t.control, t.bg, 3],
    ['mint', t.mint[1], t.mint[0], 4.5],
    ['lavender', t.lavender[1], t.lavender[0], 4.5],
    ['butter', t.butter[1], t.butter[0], 4.5],
    ['rose', t.rose[1], t.rose[0], 4.5],
  ];
  return pairs.map(([name, fg, bg, min]) => ({ mode, name, fg, bg, min }));
});

const primaryScale = {
  50: '#fdf3ee',
  100: '#fae3d7',
  200: '#f4c5ad',
  300: '#ec9f78',
  400: '#e27a4b',
  500: '#cf5c2c',
  600: light.primary,
  700: '#8a3719',
  800: '#702f19',
  900: '#5c2918',
  950: '#32130a',
};

export const TerracottaPreset = definePreset(Aura, {
  semantic: {
    primary: primaryScale,
    colorScheme: {
      light: {
        surface: {
          0: light.surface,
          50: light.bg,
          100: '#f3dccd',
          200: light.line,
          300: '#d3a98f',
          400: '#b58a74',
          500: light.muted,
          600: '#5f4235',
          700: light.text,
          800: '#2e1c15',
          900: '#22140f',
          950: '#170d09',
        },
        primary: {
          color: light.primary,
          contrastColor: light.onPrimary,
          hoverColor: '#8a3719',
          activeColor: '#702f19',
        },
        highlight: {
          background: '{primary.100}',
          focusBackground: '{primary.200}',
          color: light.text,
          focusColor: light.text,
        },
        formField: { borderColor: light.control, hoverBorderColor: light.text },
      },
      dark: {
        surface: {
          0: dark.text,
          50: '#ecd8ca',
          100: '#e0c6b5',
          200: '#d6b8a5',
          300: '#d0b09d',
          400: dark.muted,
          500: '#a88878',
          600: '#7a5a4a',
          700: dark.line,
          800: '#3b2a22',
          900: dark.surface,
          950: dark.bg,
        },
        primary: {
          color: dark.primary,
          contrastColor: dark.onPrimary,
          hoverColor: '#f4a07b',
          activeColor: '#f7b698',
        },
        highlight: {
          background: '{surface.800}',
          focusBackground: '{surface.700}',
          color: dark.text,
          focusColor: dark.text,
        },
        formField: { borderColor: dark.control, hoverBorderColor: dark.text },
      },
    },
  },
});
