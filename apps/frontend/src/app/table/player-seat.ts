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
      <span class="vl-pseat-line">{{ marks() }}</span>
      <span class="vl-pseat-line" [class.mid]="active() && !you()">
        @if (active() && computer() && action()) {
          <span class="vl-hourglass" aria-hidden="true">⏳</span>
          <span class="vl-sr-only">{{ 'table.thinking' | t }}</span>
        }
        {{
          active()
            ? computer() && action()
              ? action()
              : you()
                ? ('player.active' | t)
                : (computer() ? '' : '⛔ ') + ('player.waiting' | t)
            : ('player.waiting' | t)
        }}
      </span>
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
  /** Current phase shown instead of "on turn" while a computer plays. */
  readonly action = input<string | null>(null);
  /** Epoch ms of the server deadline; the timer shows only while set. */
  readonly deadlineAt = input<number | null>(null);

  /** "You" and "Offline" on one line, so every seat keeps the same height. */
  protected readonly marks = computed(() =>
    [
      ...(this.you() ? [this.i18n.t('player.you')] : []),
      ...(this.online() ? [] : [this.i18n.t('player.offline')]),
    ].join(' · '),
  );

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
