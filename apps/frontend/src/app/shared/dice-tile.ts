import { Component, computed, input, output } from '@angular/core';

/** Replaceable placeholder for a die (FR-017): the later dice UI swaps only this component. */
@Component({
  selector: 'app-dice-tile',
  template: `
    <button
      type="button"
      class="vl-die"
      [class.vl-die-selected]="selected()"
      [attr.aria-pressed]="selected()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="toggled.emit()"
    >
      {{ value() ?? '?' }}
      @if (selected()) {
        <span aria-hidden="true">&#10003;</span>
      }
    </button>
  `,
  styles: `
    .vl-die {
      min-width: 44px;
      min-height: 44px;
      font-size: 1.25rem;
      font-weight: 600;
      border-radius: 0.5rem;
      border: 2px solid var(--p-form-field-border-color);
      background: var(--p-content-background);
      color: var(--p-text-color);
    }
    .vl-die-selected {
      border-color: var(--p-primary-color);
      background: var(--p-highlight-background);
    }
  `,
})
export class DiceTile {
  /** `null` = not thrown yet (placeholder keeps the layout stable). */
  readonly value = input.required<number | null>();
  readonly selected = input(false);
  readonly disabled = input(false);
  readonly toggled = output();
  protected readonly label = computed(() => {
    const value = this.value();
    if (value === null) return 'Die not thrown yet';
    return `Die ${value}, ${this.selected() ? 'selected' : 'not selected'}`;
  });
}
