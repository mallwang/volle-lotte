import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { discardLayers, layerTransform } from '../core/table-view';

/** Untidy discard pile; jitter is deterministic per layer index. */
@Component({
  selector: 'app-discard-pile',
  template: `
    <div
      class="vl-pile discard"
      [class.empty]="!layers().length"
      role="img"
      [attr.aria-label]="label()"
    >
      @for (t of layers(); track $index) {
        <span class="lay" [style.transform]="t"></span>
      }
      <span class="vl-pile-label" aria-hidden="true"
        ><b>{{ played() }}</b></span
      >
    </div>
  `,
})
export class DiscardPile {
  readonly played = input.required<number>();
  private readonly i18n = inject(I18nService);
  protected readonly layers = computed(() =>
    Array.from({ length: discardLayers(this.played()) }, (_, i) => {
      const t = layerTransform(i);
      return `translate(${t.x}px, ${t.y}px) rotate(${t.rot}deg)`;
    }),
  );
  protected readonly label = computed(() => this.i18n.t('pile.discard', { count: this.played() }));
}
