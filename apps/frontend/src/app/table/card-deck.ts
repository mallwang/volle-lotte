import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { pileLevel } from '../core/table-view';

const LAYERS = { empty: 0, few: 2, medium: 4, many: 6 } as const;

/** Draw pile: layers grow with the level, the count is always text. */
@Component({
  selector: 'app-card-deck',
  template: `
    <div
      class="vl-pile draw"
      [class.empty]="level() === 'empty'"
      role="img"
      [attr.aria-label]="label()"
    >
      @for (l of layers(); track l) {
        <span
          class="lay"
          [style.transform]="'translate(' + l * 0.12 + 'px,' + -l * 0.12 + 'px)'"
        ></span>
      }
      <span class="vl-pile-label" aria-hidden="true">{{ text() }}</span>
    </div>
  `,
})
export class CardDeck {
  readonly size = input.required<number>();
  readonly total = input.required<number>();
  private readonly i18n = inject(I18nService);
  protected readonly level = computed(() => pileLevel(this.size(), this.total()));
  protected readonly layers = computed(() =>
    Array.from({ length: LAYERS[this.level()] }, (_, i) => i),
  );
  protected readonly text = computed(() => this.i18n.t('pile.rest', { count: this.size() }));
  protected readonly label = computed(() =>
    this.i18n.t('pile.draw', {
      size: this.size(),
      level: this.i18n.t(`pile.level.${this.level()}`),
    }),
  );
}
