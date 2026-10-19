import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CARD_TYPES, type Ack, type Difficulty, type Risk } from 'game-rules';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { errorMessage, type Msg } from '../core/error-message';
import { isHost, seatName } from '../core/game-view';
import { LeaveGame } from '../core/leave-game';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { HostSettings } from '../shared/host-settings';
import { TranslatePipe } from '../core/translate.pipe';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'random'];
const RISKS: Risk[] = ['none', 'medium', 'high', 'random'];

@Component({
  selector: 'app-game-lobby',
  host: { class: 'vl-narrow' },
  imports: [
    FormsModule,
    AvatarModule,
    ButtonModule,
    HostSettings,
    MessageModule,
    TagModule,
    TranslatePipe,
  ],
  template: `
    @if (socket.game(); as game) {
      <h2>{{ game.name }}</h2>
      <p>
        {{
          'gameLobby.summary'
            | t
              : {
                  target: game.rules.targetScore,
                  minimum: game.rules.minimumPoints,
                  doubling: (game.rules.fourOfAKindDoubling ? 'gameLobby.on' : 'gameLobby.off') | t,
                }
        }}
      </p>
      <p>{{ 'gameLobby.cards' | t: { list: cardList() } }}</p>
      <ul class="vl-cards">
        @for (s of game.seats; track $index) {
          <li class="vl-seat" [class.vl-seat-locked]="s.state === 'locked'">
            <p-avatar [label]="'' + ($index + 1)" shape="circle" aria-hidden="true" />
            <span class="vl-seat-name">{{ 'gameLobby.seat' | t: { n: $index + 1 } }}</span>
            @switch (s.state) {
              @case ('human') {
                <strong>{{ s.nickname }}</strong>
                @if (s.playerId === game.hostId) {
                  <p-tag [value]="'gameLobby.host' | t" icon="pi pi-star" severity="info" />
                }
                @if (s.connected === false) {
                  <p-tag [value]="'gameLobby.offline' | t" icon="pi pi-wifi" severity="danger" />
                }
                <p-tag
                  [value]="(s.ready ? 'gameLobby.ready' : 'gameLobby.notReady') | t"
                  [icon]="s.ready ? 'pi pi-check' : 'pi pi-clock'"
                  [severity]="s.ready ? 'success' : 'warn'"
                />
                @if (host() && s.playerId !== game.hostId) {
                  <p-button
                    [label]="'gameLobby.removePlayer' | t"
                    severity="secondary"
                    (onClick)="removeSeat($index)"
                  />
                }
                @if ($index === game.you.seat) {
                  <label class="vl-check">
                    <input
                      type="checkbox"
                      [checked]="s.ready"
                      (change)="ready($any($event.target).checked)"
                    />
                    {{ 'gameLobby.ready' | t }}
                  </label>
                }
              }
              @case ('computer') {
                <strong>{{ s.name }}</strong>
                <p-tag
                  [value]="
                    'gameLobby.computer'
                      | t
                        : {
                            difficulty: 'difficulty.' + s.difficulty | t,
                            risk: 'risk.' + (s.risk ?? 'medium') | t,
                          }
                  "
                  icon="pi pi-desktop"
                />
                @if (host()) {
                  <label>
                    <select
                      [attr.aria-label]="'gameLobby.difficultySeat' | t: { n: $index + 1 }"
                      (change)="
                        setSeat($index, 'computer', $any($event.target).value, s.risk ?? 'medium')
                      "
                    >
                      @for (o of difficulties; track o) {
                        <option [value]="o" [selected]="o === s.difficulty">
                          {{ 'difficulty.' + o | t }}
                        </option>
                      }
                    </select>
                  </label>
                  <label>
                    <select
                      [attr.aria-label]="'gameLobby.riskSeat' | t: { n: $index + 1 }"
                      (change)="
                        setSeat($index, 'computer', s.difficulty, $any($event.target).value)
                      "
                    >
                      @for (o of risks; track o) {
                        <option [value]="o" [selected]="o === (s.risk ?? 'medium')">
                          {{ 'risk.' + o | t }}
                        </option>
                      }
                    </select>
                  </label>
                  <p-button
                    [label]="'gameLobby.removeComputer' | t"
                    severity="secondary"
                    (onClick)="setSeat($index, 'open')"
                  />
                }
              }
              @case ('locked') {
                <p-tag
                  [value]="'gameLobby.locked' | t"
                  icon="pi pi-lock"
                  severity="secondary"
                  styleClass="vl-tag-locked"
                />
                @if (host()) {
                  <p-button
                    [label]="'gameLobby.unlock' | t"
                    severity="secondary"
                    (onClick)="setSeat($index, 'open')"
                  />
                }
              }
              @default {
                <p-tag [value]="'gameLobby.free' | t" icon="pi pi-user-plus" severity="success" />
                @if (host()) {
                  <p-button
                    [label]="'gameLobby.lock' | t"
                    severity="secondary"
                    (onClick)="setSeat($index, 'locked')"
                  />
                  <p-button
                    [label]="'gameLobby.addComputer' | t"
                    severity="secondary"
                    (onClick)="setSeat($index, 'computer', 'medium', 'medium')"
                  />
                }
              }
            }
          </li>
        }
      </ul>
      <section class="vl-settings-panel" aria-labelledby="lobby-settings-heading">
        <h3 id="lobby-settings-heading">{{ 'gameLobby.settings' | t }}</h3>
        <app-host-settings />
      </section>
      @if (!host()) {
        <p>{{ 'gameLobby.waiting' | t: { name: hostName() } }}</p>
      }
      <div class="vl-actions">
        <p-button
          [label]="(host() ? 'gameLobby.withdraw' : 'game.leave') | t"
          severity="secondary"
          (onClick)="leave.request()"
        />
        @if (host()) {
          <p-button [label]="'gameLobby.start' | t" [disabled]="!canStart()" (onClick)="start()" />
        }
      </div>
      @if (error()) {
        <p-message severity="error" role="alert">{{ error()?.() }}</p-message>
      }
    }
  `,
})
export class GameLobby {
  protected readonly socket = inject(SocketService);
  private readonly i18n = inject(I18nService);
  protected readonly leave = inject(LeaveGame);
  protected readonly difficulties = DIFFICULTIES;
  protected readonly risks = RISKS;
  protected readonly error = signal<Msg | null>(null);
  protected readonly host = computed(() => {
    const g = this.socket.game();
    return !!g && isHost(g);
  });
  protected readonly hostName = computed(() => {
    const g = this.socket.game();
    return seatName(g?.seats.find((s) => s.playerId === g.hostId));
  });
  protected readonly cardList = computed(() => {
    const counts = this.socket.game()?.rules.cardCounts;
    return CARD_TYPES.filter((c) => counts?.[c])
      .map((c) => counts?.[c] + '× ' + this.i18n.t(`card.${c}`))
      .join(', ');
  });
  protected readonly canStart = computed(() => {
    const seats = this.socket.game()?.seats ?? [];
    const occupied = seats.filter((s) => s.state === 'human' || s.state === 'computer');
    return occupied.length >= 2 && occupied.every((s) => s.state === 'computer' || s.ready);
  });

  private async run(p: Promise<Ack>): Promise<void> {
    const ack = await p;
    this.error.set(ack.ok ? null : () => errorMessage(ack, this.i18n));
  }

  protected ready(ready: boolean): Promise<void> {
    return this.run(this.socket.send('seat:ready', { ready }));
  }

  protected setSeat(
    seat: number,
    mode: 'open' | 'locked' | 'computer',
    difficulty?: Difficulty,
    risk?: Risk,
  ) {
    return this.run(this.socket.send('seat:set', { seat, mode, difficulty, risk }));
  }

  protected removeSeat(seat: number) {
    return this.run(this.socket.send('seat:remove', { seat }));
  }

  protected start(): Promise<void> {
    return this.run(this.socket.send('game:start'));
  }
}
