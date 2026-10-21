import { Component, computed, effect, inject, input, output } from '@angular/core';
import { seatName, youWon } from 'client-core';
import type { GameView } from 'game-rules';
import { Celebration } from '../core/celebration';
import { TranslatePipe } from '../core/translate.pipe';
import { Modal } from './modal';

/** Result of the finished game: winner, ranking and Leave. Cannot be dismissed. */
@Component({
  selector: 'app-game-over',
  imports: [TranslatePipe, Modal],
  template: `
    <dialog appModal aria-labelledby="over-title" (cancel)="$event.preventDefault()">
      <h2 id="over-title">{{ 'gameOver.title' | t }}</h2>
      <p class="winner">
        {{ won() ? ('gameOver.won' | t) : ('gameOver.winner' | t: { name: winnerName() }) }}
      </p>
      <ol>
        @for (r of ranking(); track r.rank) {
          <li>
            <b>{{ 'gameOver.rank' | t: { rank: r.rank } }}</b> {{ r.names }}
          </li>
        }
      </ol>
      <button type="button" class="primary" autofocus (click)="leave.emit()">
        {{ 'game.leave' | t }}
      </button>
    </dialog>
  `,
  styles: `
    dialog {
      max-width: 26rem;
      max-height: 90dvh;
      border: 1px solid var(--vl-line);
      border-radius: 12px;
      background: var(--vl-surface);
      color: var(--vl-ink);
    }
    .winner {
      font-weight: 700;
    }
    ol {
      margin: 0 0 12px;
      padding: 0;
      list-style: none;
    }
    button {
      min-height: 48px;
    }
  `,
})
export class GameOver {
  private readonly celebration = inject(Celebration);
  readonly view = input.required<GameView>();
  readonly leave = output<void>();

  protected readonly won = computed(() => youWon(this.view()));
  private readonly names = computed(() => {
    const g = this.view();
    const seats = g.seats.filter((s) => s.state === 'human' || s.state === 'computer');
    return (g.game?.players ?? []).map((p, i) => seatName(seats[i]) || p.name);
  });
  protected readonly winnerName = computed(
    () => this.names()[this.view().game?.result?.winner ?? -1] ?? '',
  );
  protected readonly ranking = computed(() =>
    (this.view().game?.result?.ranking ?? []).map((r) => ({
      rank: r.rank,
      names: r.players.map((i) => this.names()[i]).join(', '),
    })),
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.won()) return;
      this.celebration.start();
      onCleanup(() => this.celebration.stop());
    });
  }
}
