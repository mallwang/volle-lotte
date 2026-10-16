import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Grid cells (0–8, row-major 3×3) that carry a pip for each die value. */
export const PIP_CELLS: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Pip face of a die; `null` or an unknown value draws a blank face. Decorative: callers label it. */
@Component({
  selector: 'app-die-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="face" [class.rolling]="rolling()" aria-hidden="true">
      @for (cell of cells; track cell) {
        <span class="cell">
          @if (pips().includes(cell)) {
            <span class="pip"></span>
          }
        </span>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-block;
      width: 1em;
      height: 1em;
    }
    .face {
      display: grid;
      grid-template: repeat(3, 1fr) / repeat(3, 1fr);
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      padding: 0.12em;
      border-radius: 0.2em;
      border: 0.04em solid var(--p-form-field-border-color);
      background: var(--p-content-background);
    }
    .cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pip {
      width: 80%;
      height: 80%;
      border-radius: 50%;
      background: var(--p-text-color);
    }
    .rolling {
      animation: vl-tumble 0.4s linear infinite;
    }
    @keyframes vl-tumble {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .rolling {
        animation: none;
        opacity: 0.5;
      }
      .rolling .pip {
        visibility: hidden;
      }
    }
  `,
})
export class DieFace {
  readonly value = input<number | null>(null);
  readonly rolling = input(false);
  protected readonly cells = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly pips = computed(() => PIP_CELLS[this.value() ?? 0] ?? []);
}
