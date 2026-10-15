import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Ack, Difficulty } from 'game-rules';
import { errorMessage } from '../core/error-message';
import { isHost, seatName } from '../core/game-view';
import { SocketService } from '../core/socket.service';
import { DIFFICULTIES, DisconnectBanner } from '../table/disconnect-banner';

@Component({
  selector: 'app-game-lobby',
  imports: [FormsModule, DisconnectBanner],
  template: `
    @if (socket.game(); as game) {
      <h2>{{ game.name }}</h2>
      <p>
        Target {{ game.rules.targetScore }}, minimum {{ game.rules.minimumPoints }}, four of a kind
        doubling {{ game.rules.fourOfAKindDoubling ? 'on' : 'off' }}.
      </p>
      <app-disconnect-banner [game]="game" />
      <ul>
        @for (s of game.seats; track $index) {
          <li>
            Seat {{ $index + 1 }}:
            @switch (s.state) {
              @case ('human') {
                {{ s.nickname }}
                @if (s.playerId === game.hostId) {
                  <span aria-label="host">&#9733;</span>
                }
                @if (s.connected === false) {
                  (offline)
                }
                {{ s.ready ? 'ready' : 'not ready' }}
                @if ($index === game.you.seat) {
                  <label>
                    <input
                      type="checkbox"
                      [checked]="s.ready"
                      (change)="ready($any($event.target).checked)"
                    />
                    Ready
                  </label>
                }
              }
              @case ('computer') {
                Computer ({{ s.difficulty }})
                @if (host()) {
                  <label>
                    Difficulty seat {{ $index + 1 }}
                    <select
                      [value]="s.difficulty"
                      (change)="setSeat($index, 'computer', $any($event.target).value)"
                    >
                      @for (o of difficulties; track o) {
                        <option [value]="o">{{ o }}</option>
                      }
                    </select>
                  </label>
                  <button type="button" (click)="setSeat($index, 'open')">Remove computer</button>
                }
              }
              @case ('locked') {
                <span aria-hidden="true">&#128274;</span> Locked
                @if (host()) {
                  <button type="button" (click)="setSeat($index, 'open')">Unlock</button>
                }
              }
              @default {
                Free
                @if (host()) {
                  <button type="button" (click)="setSeat($index, 'locked')">Lock</button>
                  <button type="button" (click)="setSeat($index, 'computer', difficulty())">
                    Add computer
                  </button>
                }
              }
            }
          </li>
        }
      </ul>
      @if (host()) {
        <label>
          Difficulty for new computers
          <select name="new-difficulty" [(ngModel)]="difficulty">
            @for (o of difficulties; track o) {
              <option [value]="o">{{ o }}</option>
            }
          </select>
        </label>
        <button type="button" [disabled]="!canStart()" (click)="start()">Start game</button>
      } @else {
        <p>Waiting for {{ hostName() }} to start the game.</p>
      }
      <button type="button" (click)="socket.leave()">Leave game</button>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    }
  `,
})
export class GameLobby {
  protected readonly socket = inject(SocketService);
  protected readonly difficulties = DIFFICULTIES;
  protected readonly difficulty = signal<Difficulty>('medium');
  protected readonly error = signal('');
  protected readonly host = computed(() => {
    const g = this.socket.game();
    return !!g && isHost(g);
  });
  protected readonly hostName = computed(() => {
    const g = this.socket.game();
    return seatName(g?.seats.find((s) => s.playerId === g.hostId));
  });
  protected readonly canStart = computed(() => {
    const seats = this.socket.game()?.seats ?? [];
    const occupied = seats.filter((s) => s.state === 'human' || s.state === 'computer');
    return occupied.length >= 2 && occupied.every((s) => s.state === 'computer' || s.ready);
  });

  private async run(p: Promise<Ack>): Promise<void> {
    const ack = await p;
    this.error.set(ack.ok ? '' : errorMessage(ack));
  }

  protected ready(ready: boolean): Promise<void> {
    return this.run(this.socket.send('seat:ready', { ready }));
  }

  protected setSeat(seat: number, mode: 'open' | 'locked' | 'computer', difficulty?: Difficulty) {
    return this.run(this.socket.send('seat:set', { seat, mode, difficulty }));
  }

  protected start(): Promise<void> {
    return this.run(this.socket.send('game:start'));
  }
}
