import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/** Reference size of the running-game page (header plus table) in px. */
export const STAGE_WIDTH = 992;
export const STAGE_HEIGHT = 900;
/** Below this factor the table is not shown. */
export const MIN_SCALE = 0.7;
export const MIN_WIDTH = Math.ceil(STAGE_WIDTH * MIN_SCALE);
export const MIN_HEIGHT = Math.ceil(STAGE_HEIGHT * MIN_SCALE);

export type ScaleMode = 'full' | 'scaled' | 'blocked';

/** Uniform factor that fits the stage into the viewport; never enlarges. */
export function computeScale(width: number, height: number): number {
  return Math.min(1, width / STAGE_WIDTH, height / STAGE_HEIGHT);
}

export function modeFor(scale: number): ScaleMode {
  if (scale >= 1) return 'full';
  return scale >= MIN_SCALE ? 'scaled' : 'blocked';
}

/** Scales the running-game page to the window; other screens stay unscaled. */
@Injectable({ providedIn: 'root' })
export class TableScale {
  readonly viewport = signal({ width: window.innerWidth, height: window.innerHeight });
  readonly enabled = signal(false);
  readonly dismissed = signal(false);
  readonly scale = computed(() => {
    const { width, height } = this.viewport();
    return this.enabled() ? computeScale(width, height) : 1;
  });
  readonly mode = computed(() => modeFor(this.scale()));

  constructor() {
    let frame = 0;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        this.viewport.set({ width: window.innerWidth, height: window.innerHeight });
      });
    };
    window.addEventListener('resize', onResize);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('resize', onResize);
      if (frame) cancelAnimationFrame(frame);
    });
  }

  enable(): void {
    this.enabled.set(true);
  }

  disable(): void {
    this.enabled.set(false);
  }

  dismiss(): void {
    this.dismissed.set(true);
  }
}
