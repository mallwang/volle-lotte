import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { TranslatePipe } from '../core/translate.pipe';
import { TurnTimer } from './turn-timer';

/** One seat card: name, score, kind, "you", active (timer) and offline; never by colour alone. */
@Component({
  selector: 'app-player-seat',
  imports: [TranslatePipe, TurnTimer],
  template: `
    <div
      class="vl-pseat"
      [class.me]="you()"
      [class.cur]="active()"
      [class.off]="!online()"
      role="group"
      [attr.aria-label]="label()"
      [attr.aria-current]="active() ? 'true' : null"
    >
      <div class="vl-pseat-row">
        <i
          class="pi"
          [class.pi-desktop]="computer()"
          [class.pi-user]="!computer()"
          aria-hidden="true"
        ></i>
        <strong [title]="name()">{{ name() }}</strong>
      </div>
      <span class="vl-pseat-score">{{ 'player.score' | t: { score: score() } }}</span>
      <div class="vl-pseat-chips">
        @if (you()) {
          <span class="vl-status vl-status-lavender">{{ 'player.you' | t }}</span>
        }
        @if (active()) {
          <span class="vl-status vl-status-mint">{{ 'player.active' | t }}</span>
        }
        @if (!online()) {
          <span class="vl-status vl-status-rose">{{ 'player.offline' | t }}</span>
        }
      </div>
      @if (deadlineAt(); as at) {
        <div class="vl-pseat-timer"><app-turn-timer [at]="at" /></div>
      }
    </div>
  `,
})
export class PlayerSeat {
  private readonly i18n = inject(I18nService);
  readonly name = input.required<string>();
  readonly score = input(0);
  readonly computer = input(false);
  readonly online = input(true);
  readonly active = input(false);
  readonly you = input(false);
  /** Epoch ms of the server deadline; the timer shows only while set. */
  readonly deadlineAt = input<number | null>(null);

  protected readonly label = computed(() =>
    [
      this.name(),
      this.i18n.t(this.computer() ? 'player.computer' : 'player.human'),
      this.i18n.t('player.score', { score: this.score() }),
      ...(this.you() ? [this.i18n.t('player.you')] : []),
      ...(this.active() ? [this.i18n.t('player.active')] : []),
      ...(this.online() ? [] : [this.i18n.t('player.offline')]),
    ].join(', '),
  );
}
