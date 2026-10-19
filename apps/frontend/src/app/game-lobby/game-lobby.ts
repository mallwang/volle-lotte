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
import { SetupStore } from '../core/setup-store';
import { applySetup } from '../core/setup-apply';
import { defaultSetup, setupFromGame, setupsEqual, type Preset, type Setup } from '../core/setup';
import { SocketService } from '../core/socket.service';
import { StartQuestionDialog } from './start-question-dialog';
import { PresetSaveDialog } from '../shared/preset-save-dialog';
import { PresetBar } from '../shared/preset-bar';
import { ComputerRename } from '../shared/computer-rename';
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
    ComputerRename,
    HostSettings,
    MessageModule,
    PresetBar,
    PresetSaveDialog,
    StartQuestionDialog,
    TagModule,
    TranslatePipe,
  ],
  template: `
    @if (socket.game(); as game) {
      <h2>
        {{ game.name }}
        @if (game.round > 1) {
          <p-tag
            [value]="'gameLobby.rematchRound' | t: { round: game.round }"
            icon="pi pi-replay"
            severity="warn"
          />
        }
      </h2>
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
      @if (host() && game.phase === 'lobby') {
        <app-preset-bar
          mode="lobby"
          [current]="currentSetup"
          [title]="'preset.group' | t"
          [hint]="'preset.lobbyHint' | t"
          (loaded)="applyPreset($event)"
        />
        @if (presetMessage(); as m) {
          <p-message [severity]="m.skipped > 0 ? 'warn' : 'success'" size="small" role="status">{{
            (m.skipped > 0 ? 'preset.appliedSkipped' : 'preset.applied') | t: m
          }}</p-message>
        }
      }
      <ul class="vl-cards">
        @for (s of game.seats; track $index) {
          <li
            class="vl-seat"
            [class.vl-seat-locked]="s.state === 'locked'"
            [class.vl-seat-reserved]="s.state === 'reserved'"
          >
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
                @if (host()) {
                  <app-computer-rename [seat]="$index" [name]="s.name ?? ''" />
                } @else {
                  <strong>{{ s.name }}</strong>
                }
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
                  [severity]="severity[s.difficulty ?? 'random']"
                />
                @if (host()) {
                  <div class="vl-seat-row">
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
                  </div>
                  <div class="vl-seat-row">
                    <p-button
                      size="small"
                      [label]="'gameLobby.removeComputer' | t"
                      severity="secondary"
                      (onClick)="setSeat($index, 'open')"
                    />
                  </div>
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
                  <div class="vl-seat-row">
                    <p-button
                      size="small"
                      [label]="'gameLobby.unlock' | t"
                      severity="secondary"
                      (onClick)="setSeat($index, 'open')"
                    />
                  </div>
                }
              }
              @case ('reserved') {
                <strong>{{ s.nickname }}</strong>
                <p-tag [value]="'gameLobby.reserved' | t" icon="pi pi-clock" severity="warn" />
                @if (host()) {
                  <p-button
                    [label]="'gameLobby.removePlayer' | t"
                    severity="secondary"
                    (onClick)="removeSeat($index)"
                  />
                }
              }
              @default {
                <p-tag [value]="'gameLobby.free' | t" icon="pi pi-user-plus" severity="success" />
                @if (host()) {
                  <div class="vl-seat-row">
                    <p-button
                      size="small"
                      [label]="'gameLobby.lock' | t"
                      severity="secondary"
                      (onClick)="setSeat($index, 'locked')"
                    />
                    <p-button
                      size="small"
                      [label]="'gameLobby.addComputer' | t"
                      severity="secondary"
                      (onClick)="setSeat($index, 'computer', 'medium', 'medium')"
                    />
                  </div>
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
      @if (host() && reservedNames()) {
        <p class="vl-hint">{{ 'gameLobby.startDrops' | t: { names: reservedNames() } }}</p>
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
      @if (host()) {
        <app-start-question-dialog
          [(visible)]="questionOpen"
          [setup]="currentSetup()"
          (startAnyway)="startAnyway()"
          (saveFirst)="saveFirst()"
        />
        <app-preset-save-dialog
          [visible]="saveOpen()"
          (visibleChange)="saveClosed($event)"
          [setup]="currentSetup()"
          (saved)="savedForStart($event)"
        />
      }
    }
  `,
})
export class GameLobby {
  protected readonly socket = inject(SocketService);
  private readonly i18n = inject(I18nService);
  private readonly store = inject(SetupStore);
  protected readonly leave = inject(LeaveGame);
  protected readonly difficulties = DIFFICULTIES;
  protected readonly severity = {
    easy: 'success',
    medium: 'warn',
    hard: 'danger',
    random: 'secondary',
  } as const;
  protected readonly risks = RISKS;
  protected readonly error = signal<Msg | null>(null);
  protected readonly questionOpen = signal(false);
  protected readonly saveOpen = signal(false);
  protected readonly presetMessage = signal<{
    name: string;
    placed: number;
    skipped: number;
  } | null>(null);
  protected readonly currentSetup = (): Setup => {
    const game = this.socket.game();
    return game ? setupFromGame(game) : defaultSetup();
  };
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
  /** Nicknames of the seats held for the rematch, which a start would drop. */
  protected readonly reservedNames = computed(() =>
    (this.socket.game()?.seats ?? [])
      .filter((s) => s.state === 'reserved')
      .map((s) => s.nickname)
      .join(', '),
  );
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

  protected async applyPreset(preset: Preset): Promise<void> {
    const game = this.socket.game();
    if (!game) return;
    const result = await applySetup(this.socket, game, preset.setup.computers, preset.setup.speed);
    if (!result.ok) {
      this.error.set(() => errorMessage(result.ack, this.i18n));
      return;
    }
    this.error.set(null);
    this.store.setReference(preset.setup);
    this.presetMessage.set({ name: preset.name, placed: result.placed, skipped: result.skipped });
  }

  protected start(): Promise<void> {
    const game = this.socket.game();
    if (game) {
      const current = setupFromGame(game);
      const known =
        setupsEqual(current, this.store.reference()) || setupsEqual(current, this.store.last());
      if (this.store.available() && !known) {
        this.questionOpen.set(true);
        return Promise.resolve();
      }
    }
    return this.begin();
  }

  protected startAnyway(): Promise<void> {
    this.questionOpen.set(false);
    const game = this.socket.game();
    if (game) this.store.setReference(setupFromGame(game));
    return this.begin();
  }

  protected saveFirst(): void {
    this.questionOpen.set(false);
    this.saveOpen.set(true);
  }

  protected savedForStart(preset: Preset): void {
    this.store.setReference(preset.setup);
    this.saveOpen.set(false);
    void this.begin();
  }

  /** Cancelling the save dialog goes back to the question. */
  protected saveClosed(open: boolean): void {
    if (open || !this.saveOpen()) return;
    this.saveOpen.set(false);
    this.questionOpen.set(true);
  }

  private async begin(): Promise<void> {
    const game = this.socket.game();
    const ack = await this.socket.send('game:start');
    this.error.set(ack.ok ? null : () => errorMessage(ack, this.i18n));
    if (ack.ok && game && isHost(game)) this.store.saveLast(setupFromGame(game));
  }
}
