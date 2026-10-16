import { Component, input } from '@angular/core';
import { TranslatePipe } from '../core/translate.pipe';

/** Shrinking bar until the server plays the automatic move; the bar restarts whenever `at` changes. */
@Component({
  selector: 'app-turn-timer',
  imports: [TranslatePipe],
  template: `
    @for (deadline of [at()]; track deadline) {
      <div
        class="vl-bust-timer"
        aria-hidden="true"
        [style.animation-duration.ms]="remaining(deadline)"
      ></div>
    }
    <span class="vl-sr-only">{{ 'turn.timer' | t }}</span>
  `,
})
export class TurnTimer {
  /** Epoch ms of the server deadline. */
  readonly at = input.required<number>();

  protected remaining = (at: number) => Math.max(0, at - Date.now());
}
