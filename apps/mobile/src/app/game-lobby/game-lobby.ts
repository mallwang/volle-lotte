import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import type { Ack, Difficulty, GameSettings, Intents, Risk } from 'game-rules';
import { errorMessage } from '../core/error-message';
import { MobileI18nService } from '../core/i18n.service';
import { MobileSocketService } from '../core/mobile-socket.service';
import { TranslatePipe } from '../core/translate.pipe';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'random'];
const RISKS: Risk[] = ['none', 'medium', 'high', 'random'];
type Mode = 'open' | 'locked' | 'computer';
const SETTINGS = [
  ['fastComputerDice', 'settings.fastComputerDice'],
  ['showBustProbability', 'settings.showBustProbability'],
  ['spectating', 'settings.spectating'],
] as const;

/** Host and guest lobby. Presets are deferred, so Start asks no save question. */
@Component({
  selector: 'app-game-lobby',
  imports: [TranslatePipe],
  styles: `
    :host {
      display: block;
    }
    :host > * + * {
      margin-top: 12px;
    }
    .scale {
      display: flex;
      justify-content: space-between;
      color: var(--vl-muted);
      font-size: 0.85rem;
    }
    .add-seat {
      border-style: dashed;
    }
    .chips {
      display: flex;
      margin-top: 6px;
      flex-wrap: wrap;
      gap: 6px;
      vertical-align: middle;
    }
    h3 {
      display: inline;
      margin: 0 8px 0 0;
      font-size: 1rem;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .row > * {
      flex: 1;
    }
    .seat-name {
      overflow-wrap: anywhere;
    }
  `,
  template: `
    @if (socket.game(); as game) {
      <h2>{{ game.name }}</h2>
      @if (hostNotice(); as n) {
        <p class="chip warn" role="status">{{ n }}</p>
      }
      <ul class="grid">
        @for (s of game.seats; track $index) {
          @if (s.state !== 'locked') {
            <li class="card">
              <h3>{{ 'gameLobby.seat' | t: { n: $index + 1 } }}</h3>
              @switch (s.state) {
                @case ('human') {
                  <strong class="seat-name">{{ s.nickname }}</strong>
                  <span class="chips">
                    @if (s.playerId === game.hostId) {
                      <span class="chip">{{ 'gameLobby.host' | t }}</span>
                    }
                    @if (s.connected === false) {
                      <span class="chip bad">{{ 'gameLobby.offline' | t }}</span>
                    }
                    <span class="chip" [class.warn]="!s.ready">{{
                      (s.ready ? 'gameLobby.ready' : 'gameLobby.notReady') | t
                    }}</span>
                  </span>
                  @if (host() && s.playerId !== game.hostId) {
                    <div class="row">
                      <button type="button" (click)="run('seat:remove', { seat: $index })">
                        {{ 'gameLobby.removePlayer' | t }}
                      </button>
                    </div>
                  }
                }
                @case ('computer') {
                  <strong class="seat-name">{{ s.name }}</strong>
                  <span class="chip">{{
                    'gameLobby.computer'
                      | t
                        : {
                            difficulty: 'difficulty.' + s.difficulty | t,
                            risk: 'risk.' + (s.risk ?? 'medium') | t,
                          }
                  }}</span>
                  @if (host()) {
                    <div class="row">
                      <div>
                        <label [for]="'difficulty-' + $index">{{
                          'mobile.lobby.difficulty' | t
                        }}</label>
                        <select
                          [id]="'difficulty-' + $index"
                          (change)="setSeat($index, 'computer', $any($event.target).value, s.risk)"
                        >
                          @for (o of difficulties; track o) {
                            <option [value]="o" [selected]="o === s.difficulty">
                              {{ 'difficulty.' + o | t }}
                            </option>
                          }
                        </select>
                      </div>
                      <div>
                        <label [for]="'risk-' + $index">{{ 'mobile.lobby.risk' | t }}</label>
                        <select
                          [id]="'risk-' + $index"
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
                      </div>
                    </div>
                    <div class="row">
                      <button type="button" (click)="setSeat($index, 'open')">
                        {{ 'gameLobby.removeComputer' | t }}
                      </button>
                    </div>
                  }
                }
                @default {
                  <span class="chip">{{ 'gameLobby.free' | t }}</span>
                  @if (host()) {
                    <div class="row">
                      <button type="button" (click)="setSeat($index, 'locked')">
                        {{ 'gameLobby.lock' | t }}
                      </button>
                      <button
                        type="button"
                        (click)="setSeat($index, 'computer', 'medium', 'medium')"
                      >
                        {{ 'gameLobby.addComputer' | t }}
                      </button>
                    </div>
                  }
                }
                @case ('reserved') {
                  <strong class="seat-name">{{ s.nickname }}</strong>
                  <span class="chip warn">{{ 'gameLobby.reserved' | t }}</span>
                  @if (host()) {
                    <div class="row">
                      <button type="button" (click)="run('seat:remove', { seat: $index })">
                        {{ 'gameLobby.removePlayer' | t }}
                      </button>
                    </div>
                  }
                }
              }
            </li>
          }
        }
      </ul>
      @if (host() && firstLocked() >= 0) {
        <div class="card add-seat">
          <button
            type="button"
            class="ghost"
            [attr.aria-expanded]="adding()"
            (click)="adding.set(!adding())"
          >
            + {{ 'mobile.lobby.addSeat' | t }}
          </button>
          @if (adding()) {
            <div class="row">
              <button type="button" (click)="addSeat('open')">
                {{ 'mobile.lobby.openSeat' | t }}
              </button>
              <button type="button" (click)="addSeat('computer', 'medium', 'medium')">
                {{ 'gameLobby.addComputer' | t }}
              </button>
            </div>
          }
        </div>
      }
      <details class="card">
        <summary>{{ 'gameLobby.settings' | t }}</summary>
        @for (s of settings; track s[0]) {
          <label class="check">
            <input
              type="checkbox"
              [checked]="game[s[0]]"
              [disabled]="!host()"
              (change)="toggle(s[0], $any($event.target).checked)"
            />
            {{ s[1] | t }}
          </label>
        }
        <label for="speed">{{ 'settings.computerSpeed' | t }}</label>
        <input
          id="speed"
          type="range"
          min="1"
          max="5"
          [value]="game.computerSpeed"
          [disabled]="!host()"
          (change)="change({ computerSpeed: +$any($event.target).value })"
        />
        <div class="scale" aria-hidden="true">
          <span>1 {{ 'settings.scaleSlow' | t }}</span>
          <span>3 {{ 'settings.scaleDefault' | t }}</span>
          <span>5 {{ 'settings.scaleFast' | t }}</span>
        </div>
        @if (!host()) {
          <small>{{ 'settings.hostOnly' | t }}</small>
        }
      </details>
      @if (!host()) {
        <p>{{ 'gameLobby.waiting' | t: { name: hostName() } }}</p>
      }
      @if (error()) {
        <p class="chip bad" role="alert">{{ error() }}</p>
      }
      <button type="button" class="danger" (click)="leave()">
        {{ (host() ? 'gameLobby.withdraw' : 'game.leave') | t }}
      </button>
      <div class="action-bar">
        @if (host() && me()?.ready) {
          <button type="button" (click)="run('seat:ready', { ready: false })">
            {{ 'gameLobby.notReady' | t }}
          </button>
          <button type="button" class="go" [disabled]="!canStart()" (click)="run('game:start')">
            {{ 'gameLobby.start' | t }}
          </button>
        } @else {
          <button
            type="button"
            class="primary"
            [disabled]="!canReady()"
            (click)="run('seat:ready', { ready: !me()?.ready })"
          >
            {{ (me()?.ready ? 'gameLobby.notReady' : 'gameLobby.ready') | t }}
          </button>
        }
      </div>
    }
  `,
})
export class GameLobby {
  protected readonly socket = inject(MobileSocketService);
  private readonly router = inject(Router);
  private readonly i18n = inject(MobileI18nService);
  protected readonly difficulties = DIFFICULTIES;
  protected readonly risks = RISKS;
  protected readonly settings = SETTINGS;
  protected readonly error = signal('');
  protected readonly hostNotice = signal('');
  protected readonly adding = signal(false);
  protected readonly firstLocked = computed(
    () => this.socket.game()?.seats.findIndex((s) => s.state === 'locked') ?? -1,
  );

  protected readonly host = computed(() => {
    const g = this.socket.game();
    return !!g && g.hostId === g.you.playerId;
  });
  protected readonly me = computed(
    () => this.socket.game()?.seats[this.socket.game()?.you.seat ?? -1],
  );
  protected readonly hostName = computed(
    () => this.hostSeat()?.nickname ?? this.hostSeat()?.name ?? '',
  );
  private readonly hostSeat = computed(() => {
    const g = this.socket.game();
    return g?.seats.find((s) => s.playerId === g.hostId);
  });
  /** The host can only ready up once every seat is taken and every other human is ready. */
  protected readonly canReady = computed(() => {
    const g = this.socket.game();
    if (!g || !this.host()) return true;
    return g.seats.every(
      (s) => s.state !== 'open' && (s.state !== 'human' || s.ready || s.playerId === g.hostId),
    );
  });
  /** At least two occupied seats, every human ready. */
  protected readonly canStart = computed(() => {
    const occupied = (this.socket.game()?.seats ?? []).filter(
      (s) => s.state === 'human' || s.state === 'computer',
    );
    return occupied.length >= 2 && occupied.every((s) => s.state === 'computer' || s.ready);
  });

  constructor() {
    let hostId: string | undefined;
    effect(() => {
      const g = this.socket.game();
      // removed or closed: the shell shows the server notice, the list is the way out
      if (!g) return void untracked(() => this.router.navigateByUrl('/'));
      if (g.phase === 'running')
        return void untracked(() => this.router.navigateByUrl(`/table/${g.id}`));
      if (hostId && g.hostId !== hostId) {
        const who = untracked(() => this.hostName());
        this.hostNotice.set(this.i18n.t('log.hostChanged', { who }));
      }
      hostId = g.hostId;
    });
  }

  protected async run<K extends keyof Intents>(event: K, payload?: Intents[K][0]): Promise<void> {
    const ack: Ack = await this.socket.send(event, payload);
    this.error.set(ack.ok ? '' : errorMessage(ack, this.i18n));
  }

  protected setSeat(seat: number, mode: Mode, difficulty?: Difficulty, risk?: Risk) {
    return this.run('seat:set', { seat, mode, difficulty, risk });
  }

  protected addSeat(mode: Mode, difficulty?: Difficulty, risk?: Risk) {
    this.adding.set(false);
    return this.setSeat(this.firstLocked(), mode, difficulty, risk);
  }

  protected toggle(key: (typeof SETTINGS)[number][0], value: boolean) {
    return this.change({ [key]: value });
  }

  protected change(settings: Partial<GameSettings>) {
    return this.run('game:settings', settings);
  }

  protected async leave(): Promise<void> {
    const ack = await this.socket.leave();
    if (ack.ok) await this.router.navigateByUrl('/');
    else this.error.set(errorMessage(ack, this.i18n));
  }
}
