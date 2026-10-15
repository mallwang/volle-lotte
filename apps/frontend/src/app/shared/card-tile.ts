import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n.service';

/** Replaceable placeholder for the drawn card (FR-017). */
@Component({
  selector: 'app-card-tile',
  template: `<span class="vl-card">{{ label() }}</span>`,
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
  private readonly i18n = inject(I18nService);
  protected readonly label = computed(() => {
    const card = this.card();
    return this.i18n.t('card.tile', { card: this.i18n.t(card ? `card.${card}` : 'card.none') });
  });
}
