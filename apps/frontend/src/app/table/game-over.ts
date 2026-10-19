import { Component, computed, inject, input } from '@angular/core';
import type { GameView } from 'game-rules';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import {
  isHost,
  isSpectator,
  playerSeats,
  rematchState,
  seatName,
  youWon,
} from '../core/game-view';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';

/** The result of a finished game, on top of the table. Its only way out is back to the lobby. */
@Component({
  selector: 'app-game-over',
  imports: [ButtonModule, DialogModule, TagModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'gameOver.title' | t"
      [style]="{ width: '28rem', maxWidth: '95vw' }"
      [visible]="visible()"
      [modal]="true"
      [closable]="false"
      [closeOnEscape]="false"
      [draggable]="false"
    >
      @if (view().game?.result; as result) {
        <p class="vl-outcome">
          <i class="pi pi-trophy" aria-hidden="true"></i>
          {{ won() ? ('gameOver.won' | t) : ('gameOver.winner' | t: { name: winner() }) }}
        </p>
        <p>{{ 'gameOver.reason.' + result.reason | t }}</p>
        <ol class="vl-ranking">
          @for (r of result.ranking; track r.rank) {
            <li [value]="r.rank">
              <p-tag
                [value]="'gameOver.rank' | t: { rank: r.rank }"
                [severity]="r.rank === 1 ? 'success' : 'secondary'"
              />
              @for (i of r.players; track i; let last = $last) {
                <span [class.vl-you]="i === mine()">
                  {{ view().game!.players[i].name }} ({{ view().game!.players[i].score }}){{
                    i === mine() ? ' · ' + ('gameOver.you' | t) : ''
                  }}</span
                >{{ last ? '' : ',' }}
              }
            </li>
          }
        </ol>
      }
      @if (spectator()) {
        <p class="vl-hint">{{ 'gameOver.spectatorHint' | t }}</p>
      } @else if (host()) {
        <p class="vl-hint">{{ 'gameOver.rematchHint' | t }}</p>
      } @else {
        @switch (state()) {
          @case ('open') {
            <p class="vl-hint" role="status">
              {{
                'gameOver.seatReserved' | t: { name: hostName(), n: (view().you.reserved ?? 0) + 1 }
              }}
            </p>
          }
          @case ('closed') {
            <p class="vl-hint" role="status">{{ 'gameOver.startedWithoutYou' | t }}</p>
          }
          @default {
            <p class="vl-hint" role="status">
              {{ 'gameOver.waitingForHost' | t: { name: hostName() } }}
            </p>
          }
        }
      }
      <div class="vl-actions">
        @if (spectator()) {
          <!-- spectators only go back: rematches are for the players -->
        } @else if (host()) {
          <p-button [label]="'gameOver.rematch' | t" (onClick)="socket.rematch()" />
        } @else {
          <p-button
            [label]="'gameOver.rejoin' | t"
            [disabled]="state() !== 'open'"
            (onClick)="socket.rejoinRematch()"
          />
        }
        <p-button
          [label]="'gameOver.back' | t"
          severity="secondary"
          [outlined]="true"
          (onClick)="socket.leave()"
        />
      </div>
    </p-dialog>
  `,
  styles: `
    .vl-outcome {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 0;
    }
    .vl-ranking {
      list-style: none;
      margin: 0 0 1rem;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }
    .vl-you {
      font-weight: 700;
    }
  `,
})
export class GameOver {
  readonly view = input.required<GameView>();
  readonly visible = input(false);
  protected readonly socket = inject(SocketService);

  protected readonly spectator = computed(() => isSpectator(this.view()));
  protected readonly won = computed(() => youWon(this.view()));
  /** The host decides about the rematch; everybody else waits for it. */
  protected readonly host = computed(() => isHost(this.view()));
  protected readonly state = computed(() => rematchState(this.view()));
  protected readonly hostName = computed(() => {
    const v = this.view();
    return seatName(v.seats.find((s) => s.playerId === v.hostId));
  });
  protected readonly winner = computed(() => {
    const g = this.view().game;
    return g?.result ? g.players[g.result.winner].name : '';
  });
  /** Engine index of this player, to mark their own row. */
  protected readonly mine = computed(() => playerSeats(this.view()).indexOf(this.view().you.seat));
}
