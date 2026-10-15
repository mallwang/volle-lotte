import { Component, input } from '@angular/core';

/** Replaceable placeholder for the drawn card (FR-017). */
@Component({
  selector: 'app-card-tile',
  template: `<span class="vl-card">Card: {{ card() ?? 'none' }}</span>`,
  styles: `
    .vl-card {
      display: inline-block;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid var(--p-content-border-color);
      background: var(--p-content-background);
    }
  `,
})
export class CardTile {
  readonly card = input<string | null>(null);
}
