import { Component, computed, inject, input } from '@angular/core';
import type { CardType } from 'game-rules';
import { GameCard } from '../shared/game-card';
import { I18nService } from '../core/i18n.service';
import { discardLayers, layerTransform } from '../core/table-view';

/** Untidy discard pile; jitter is deterministic per layer index. */
@Component({
  selector: 'app-discard-pile',
  imports: [GameCard],
  template: `
    <div
      class="vl-pile discard"
      [class.empty]="played() === 0"
      role="img"
      [attr.aria-label]="label()"
    >
      @for (t of layers(); track $index) {
        <span class="lay" [style.transform]="t"></span>
      }
      @if (previous(); as p) {
        @for (c of [p]; track played()) {
          <app-game-card class="vl-prev" [card]="c" />
        }
      }
      <span class="vl-pile-label" aria-hidden="true">{{ text() }}</span>
    </div>
  `,
})
export class DiscardPile {
  readonly played = input.required<number>();
  /** The card played before the current one, shown greyed out on top. */
  readonly previous = input<CardType | null>(null);
  private readonly i18n = inject(I18nService);
  protected readonly layers = computed(() =>
    Array.from({ length: discardLayers(this.played()) }, (_, i) => {
      const t = layerTransform(i);
      return `translate(${t.x}px, ${t.y}px) rotate(${t.rot}deg)`;
    }),
  );
  protected readonly text = computed(() => this.i18n.t('pile.discarded', { count: this.played() }));
  protected readonly label = computed(() => this.i18n.t('pile.discard', { count: this.played() }));
}
