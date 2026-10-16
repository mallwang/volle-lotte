import { Component, computed, inject, input } from '@angular/core';
import type { CardType } from 'game-rules';
import { I18nService } from '../core/i18n.service';

const IMAGES: Record<CardType, string> = {
  bonus200: 'bonus-200',
  bonus300: 'bonus-300',
  bonus400: 'bonus-400',
  bonus500: 'bonus-500',
  bonus600: 'bonus-600',
  doubleLotte: 'doppelte-lotte',
  stop: 'forbidden',
  star: 'star',
  street: 'street-2000',
  plusMinus: 'plus-minus-1000',
  clover: 'lucky',
};

/** The drawn card, as the hand-drawn picture (2:3). */
@Component({
  selector: 'app-game-card',
  template: `
    <div
      class="vl-gcard"
      [class.empty]="!card()"
      [class.pic]="!!card()"
      role="img"
      [attr.aria-label]="label()"
    >
      @if (card(); as c) {
        <img [src]="'/cards/' + image() + '.png'" alt="" />
      }
      <ng-content />
    </div>
  `,
})
export class GameCard {
  readonly card = input<CardType | null>(null);
  private readonly i18n = inject(I18nService);
  protected readonly image = computed(() => IMAGES[this.card() ?? 'stop']);
  protected readonly name = computed(() => this.i18n.t('card.' + (this.card() ?? 'none')));
  protected readonly label = computed(() => this.i18n.t('card.tile', { card: this.name() }));
}
