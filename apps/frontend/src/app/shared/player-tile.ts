import { Component, input } from '@angular/core';
import { TranslatePipe } from '../core/translate.pipe';

/** Name, score, role and state of one player; the active player is marked by text, not colour alone. */
@Component({
  selector: 'app-player-tile',
  imports: [TranslatePipe],
  template: `
    <div class="vl-player" [attr.aria-current]="active() ? 'true' : null">
      <i
        class="pi"
        [class.pi-desktop]="computer()"
        [class.pi-user]="!computer()"
        role="img"
        [attr.aria-label]="(computer() ? 'player.computer' : 'player.human') | t"
      ></i>
      <strong>{{ name() }}</strong>
      @if (active()) {
        <span class="vl-status vl-status-mint">{{ 'player.active' | t }}</span>
      }
      @if (role()) {
        <span class="vl-status vl-status-lavender">{{ role() }}</span>
      }
      @if (!online()) {
        <span class="vl-status vl-status-rose">{{ reconnect() ?? ('player.offline' | t) }}</span>
      }
      @if (score() !== null) {
        <span>{{ 'player.score' | t: { score: score() ?? 0 } }}</span>
      }
    </div>
  `,
  styles: `
    .vl-player {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0.5rem;
    }
    .vl-player[aria-current='true'] {
      border: 2px solid var(--p-primary-color);
    }
  `,
})
export class PlayerTile {
  readonly name = input.required<string>();
  readonly score = input<number | null>(null);
  readonly role = input<string | null>(null);
  readonly online = input(true);
  /** Computer-controlled seat (also a human replaced by a computer). */
  readonly computer = input(false);
  readonly active = input(false);
  /** Offline text, e.g. a reconnect countdown. */
  readonly reconnect = input<string | null>(null);
}
