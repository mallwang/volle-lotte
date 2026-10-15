import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Ack, Difficulty } from 'game-rules';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { errorMessage } from '../core/error-message';
import { isHost, seatName } from '../core/game-view';
import { SocketService } from '../core/socket.service';
import { DIFFICULTIES, DisconnectBanner } from '../table/disconnect-banner';

@Component({
  selector: 'app-game-lobby',
  imports: [FormsModule, DisconnectBanner, AvatarModule, ButtonModule, MessageModule, TagModule],
  template: `
    @if (socket.game(); as game) {
      <h2>{{ game.name }}</h2>
      <p>
        Target {{ game.rules.targetScore }}, minimum {{ game.rules.minimumPoints }}, four of a kind
        doubling {{ game.rules.fourOfAKindDoubling ? 'on' : 'off' }}.
      </p>
      <app-disconnect-banner [game]="game" />
      <ul class="vl-cards">
        @for (s of game.seats; track $index) {
          <li class="vl-seat">
            <p-avatar [label]="'' + ($index + 1)" shape="circle" aria-hidden="true" />
            <span class="vl-seat-name">Seat {{ $index + 1 }}</span>
            @switch (s.state) {
              @case ('human') {
                <strong>{{ s.nickname }}</strong>
                @if (s.playerId === game.hostId) {
                  <p-tag value="Host" icon="pi pi-star" severity="info" />
                }
                @if (s.connected === false) {
                  <p-tag value="Offline" icon="pi pi-wifi" severity="danger" />
                }
                <p-tag
                  [value]="s.ready ? 'Ready' : 'Not ready'"
                  [icon]="s.ready ? 'pi pi-check' : 'pi pi-clock'"
                  [severity]="s.ready ? 'success' : 'warn'"
                />
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
                <p-tag [value]="'Computer (' + s.difficulty + ')'" icon="pi pi-desktop" />
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
                  <p-button
                    label="Remove computer"
                    severity="secondary"
                    (onClick)="setSeat($index, 'open')"
                  />
                }
              }
              @case ('locked') {
                <p-tag value="Locked" icon="pi pi-lock" severity="secondary" />
                @if (host()) {
                  <p-button
                    label="Unlock"
                    severity="secondary"
                    (onClick)="setSeat($index, 'open')"
                  />
                }
              }
              @default {
                <p-tag value="Free" icon="pi pi-user-plus" severity="success" />
                @if (host()) {
                  <p-button
                    label="Lock"
                    severity="secondary"
                    (onClick)="setSeat($index, 'locked')"
                  />
                  <p-button
                    label="Add computer"
                    severity="secondary"
                    (onClick)="setSeat($index, 'computer', 'medium')"
                  />
                }
              }
            }
          </li>
        }
      </ul>
      @if (host()) {
        <p-button label="Start game" [disabled]="!canStart()" (onClick)="start()" />
      } @else {
        <p>Waiting for {{ hostName() }} to start the game.</p>
      }
      <p-button label="Leave game" severity="secondary" (onClick)="socket.leave()" />
      @if (error()) {
        <p-message severity="error" role="alert">{{ error() }}</p-message>
      }
    }
  `,
})
export class GameLobby {
  protected readonly socket = inject(SocketService);
  protected readonly difficulties = DIFFICULTIES;
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
