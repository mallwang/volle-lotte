import { Component, input } from '@angular/core';

/** Name, score, role and state of one player; the active player is marked by text, not colour alone. */
@Component({
  selector: 'app-player-tile',
  template: `
    <div class="vl-player" [attr.aria-current]="active() ? 'true' : null">
      <strong>{{ name() }}</strong>
      @if (active()) {
        <span class="vl-status vl-status-mint">Active</span>
      }
      @if (role()) {
        <span class="vl-status vl-status-lavender">{{ role() }}</span>
      }
      @if (!online()) {
        <span class="vl-status vl-status-rose">{{ reconnect() ?? 'Offline' }}</span>
      }
      @if (score() !== null) {
        <span>Score: {{ score() }}</span>
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
  readonly active = input(false);
  /** Offline text, e.g. a reconnect countdown. */
  readonly reconnect = input<string | null>(null);
}
