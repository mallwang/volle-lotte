import { Component, computed, inject, input } from '@angular/core';
import type { CardType } from 'game-rules';
import { I18nService } from '../core/i18n.service';

const ICONS: Record<CardType, string> = {
  bonus200: 'pi-plus-circle',
  bonus300: 'pi-plus-circle',
  bonus400: 'pi-plus-circle',
  bonus500: 'pi-plus-circle',
  bonus600: 'pi-plus-circle',
  doubleLotte: 'pi-clone',
  stop: 'pi-ban',
  star: 'pi-star',
  street: 'pi-arrows-h',
  plusMinus: 'pi-arrow-right-arrow-left',
  clover: 'pi-sparkles',
};

/** The drawn card, rendered in CSS (2:3). */
@Component({
  selector: 'app-game-card',
  template: `
    <div class="vl-gcard" [class.empty]="!card()" role="img" [attr.aria-label]="label()">
      @if (card(); as c) {
        <span class="val">{{ value() }}</span>
        <i class="pi icn" [class]="icon()" aria-hidden="true"></i>
        <span class="nm">{{ name() }}</span>
      } @else {
        <span class="nm">{{ name() }}</span>
      }
    </div>
  `,
})
export class GameCard {
  readonly card = input<CardType | null>(null);
  private readonly i18n = inject(I18nService);
  protected readonly icon = computed(() => ICONS[this.card() ?? 'stop']);
  protected readonly value = computed(
    () => /^bonus(\d+)$/.exec(this.card() ?? '')?.[1].replace(/^/, '+') ?? '',
  );
  protected readonly name = computed(() => this.i18n.t(`card.${this.card() ?? 'none'}`));
  protected readonly label = computed(() => this.i18n.t('card.tile', { card: this.name() }));
}
