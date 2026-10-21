import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CARD_TYPES, rulesError, type CardType, type Rules } from 'game-rules';
import { errorMessage, type Msg } from '../core/error-message';
import { I18nService } from '../core/i18n.service';
import { PresetBar } from '../shared/preset-bar';
import { applySetup } from '../core/setup-apply';
import { SetupStore } from '../core/setup-store';
import {
  DEFAULT_SPEED,
  defaultSetup,
  planComputers,
  sanitizeSetup,
  setupsEqual,
  type ComputerSeat,
  type Preset,
  type Setup,
} from 'client-core';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';

@Component({
  selector: 'app-create-game',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    PresetBar,
    SelectButtonModule,
    TranslatePipe,
  ],
  template: `
    <form class="vl-form" (ngSubmit)="submit()">
      <h2>{{ 'create.title' | t }}</h2>
      <app-preset-bar
        mode="create"
        [current]="currentSetup"
        [title]="(store.last() ? 'preset.prefilled' : 'preset.group') | t"
        [hint]="(store.last() ? 'preset.prefilledHint' : 'preset.hintCreate') | t"
        [changed]="changedFromDefaults()"
        (loaded)="loadPreset($event)"
        (resetRequested)="resetToDefaults()"
      />
      <div class="vl-row">
        <div class="vl-field">
          <label for="game-name">{{ 'create.name' | t }}</label>
          <input
            pInputText
            id="game-name"
            name="gameName"
            [(ngModel)]="name"
            maxlength="40"
            autocomplete="off"
            data-bwignore
            data-lpignore="true"
            data-1p-ignore
          />
          @if (errors().name; as e) {
            <p-message severity="error" size="small" role="alert">{{ e }}</p-message>
          }
        </div>
        <div class="vl-field">
          <label for="game-password">{{ 'create.password' | t }}</label>
          <input
            pInputText
            id="game-password"
            name="gamePassword"
            type="password"
            [(ngModel)]="password"
            autocomplete="new-password"
            aria-describedby="game-password-hint"
            data-bwignore
            data-lpignore="true"
            data-1p-ignore
          />
          <small id="game-password-hint">{{ 'create.passwordHint' | t }}</small>
          @if (errors().password; as e) {
            <p-message severity="error" size="small" role="alert">{{ e }}</p-message>
          }
        </div>
      </div>
      <div class="vl-field">
        <span id="seats-label">{{ 'create.seats' | t }}</span>
        <p-selectbutton
          [options]="seatOptions"
          optionLabel="label"
          optionValue="value"
          [(ngModel)]="seats"
          name="seats"
          [allowEmpty]="false"
          ariaLabelledBy="seats-label"
        />
      </div>
      <details class="vl-rules">
        <summary>
          <span
            >{{ 'create.rules' | t }} <small>{{ 'create.rulesFixed' | t }}</small></span
          >
          <i class="pi pi-chevron-down" aria-hidden="true"></i>
        </summary>
        <div class="vl-row">
          <div class="vl-field">
            <label for="target">{{ 'create.target' | t }}</label>
            <input
              pInputText
              id="target"
              name="target"
              type="number"
              min="1"
              [(ngModel)]="targetScore"
            />
          </div>
          <div class="vl-field">
            <label for="minimum">{{ 'create.minimum' | t }}</label>
            <input
              pInputText
              id="minimum"
              name="minimum"
              type="number"
              min="0"
              [(ngModel)]="minimumPoints"
            />
          </div>
        </div>
        <div class="vl-actions">
          <p-checkbox inputId="doubling" name="doubling" [binary]="true" [(ngModel)]="doubling" />
          <label for="doubling">{{ 'create.doubling' | t }}</label>
        </div>
        <h3>{{ 'create.cardsPerType' | t }}</h3>
        <div class="vl-card-grid">
          @for (t of cardTypes; track t) {
            <div class="vl-card-input">
              <span class="vl-card-face" aria-hidden="true">{{ cardLabels[t] }}</span>
              <label [for]="'card-' + t">{{ 'card.' + t | t }}</label>
              <input
                pInputText
                [id]="'card-' + t"
                [name]="'card-' + t"
                type="number"
                min="0"
                [ngModel]="counts()[t]"
                (ngModelChange)="setCount(t, $event)"
              />
            </div>
          }
        </div>
        @if (errors().rules; as e) {
          <p-message severity="error" size="small" role="alert">{{ e }}</p-message>
        }
      </details>
      @if (showPending()) {
        <p-message severity="info" size="small" role="status">{{
          'create.pendingComputers'
            | t: { count: effectiveComputers().length, speed: pendingSpeed() }
        }}</p-message>
      }
      <div class="vl-actions">
        <a routerLink="/lobby">{{ 'create.cancel' | t }}</a>
        <p-button type="submit" [label]="'create.submit' | t" />
      </div>
      @if (error()) {
        <p-message severity="error" role="alert">{{ error()?.() }}</p-message>
      }
    </form>
  `,
})
export class CreateGame {
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  protected readonly store = inject(SetupStore);
  private readonly initial = this.store.last() ?? defaultSetup();
  protected readonly cardTypes = CARD_TYPES;
  protected readonly seatOptions = [2, 3, 4, 5, 6, 7, 8].map((n) => ({
    label: String(n),
    value: n,
  }));
  /** Short text on the preview tile and the full name under it. */
  protected readonly cardLabels: Record<CardType, string> = {
    bonus200: '+200',
    bonus300: '+300',
    bonus400: '+400',
    bonus500: '+500',
    bonus600: '+600',
    doubleLotte: '×2',
    stop: '✋',
    star: '✨',
    street: '1-6',
    plusMinus: '±',
    clover: '☘',
  };
  private readonly i18n = inject(I18nService);
  protected readonly name = signal(
    this.i18n.t('create.defaultName', { nickname: this.socket.session()?.nickname ?? 'My' }),
  );
  protected readonly password = signal('');
  protected readonly seats = signal(this.initial.seats);
  protected readonly targetScore = signal(this.initial.rules.targetScore);
  protected readonly minimumPoints = signal(this.initial.rules.minimumPoints);
  protected readonly doubling = signal(this.initial.rules.fourOfAKindDoubling);
  protected readonly counts = signal<Record<CardType, number>>({
    ...this.initial.rules.cardCounts,
  });
  /** Computers and speed the lobby of the new game gets; they are changed in the lobby, not here. */
  protected readonly pendingComputers = signal<ComputerSeat[]>(this.initial.computers);
  protected readonly pendingSpeed = signal(this.initial.speed);
  private readonly pendingFastDice = signal(this.initial.fastComputerDice);
  private readonly pendingShowBust = signal(this.initial.showBustProbability);
  /** The pending computers as they fit into a fresh room with the chosen number of seats. */
  protected readonly effectiveComputers = computed(
    () =>
      planComputers(
        Array.from(
          { length: this.seats() },
          (_, i) => ({ state: i === 0 ? 'human' : 'open' }) as const,
        ),
        this.pendingComputers(),
      ).place,
  );
  protected readonly showPending = computed(
    () =>
      this.effectiveComputers().length > 0 ||
      this.pendingSpeed() !== DEFAULT_SPEED ||
      this.pendingFastDice() ||
      this.pendingShowBust(),
  );
  protected readonly error = signal<Msg | null>(null);

  /** What "Save as preset" stores: the form plus the computers and speed the lobby will get. */
  protected readonly currentSetup = (): Setup =>
    sanitizeSetup({
      seats: this.seats(),
      rules: this.rules(),
      computers: this.effectiveComputers(),
      speed: this.pendingSpeed(),
      fastComputerDice: this.pendingFastDice(),
      showBustProbability: this.pendingShowBust(),
    });

  protected readonly changedFromDefaults = computed(
    () => !setupsEqual(this.currentSetup(), defaultSetup()),
  );

  /** Defaults for seats, rules and the pending computers; presets and the typed name and password stay. */
  protected resetToDefaults(): void {
    this.apply(defaultSetup());
    this.store.resetLast();
  }

  protected loadPreset(preset: Preset): void {
    this.apply(preset.setup);
    this.store.setReference(preset.setup);
  }

  private apply(setup: Setup): void {
    this.seats.set(setup.seats);
    this.targetScore.set(setup.rules.targetScore);
    this.minimumPoints.set(setup.rules.minimumPoints);
    this.doubling.set(setup.rules.fourOfAKindDoubling);
    this.counts.set({ ...setup.rules.cardCounts });
    this.pendingComputers.set(setup.computers);
    this.pendingSpeed.set(setup.speed);
    this.pendingFastDice.set(setup.fastComputerDice);
    this.pendingShowBust.set(setup.showBustProbability);
  }

  protected setCount(type: CardType, value: number): void {
    this.counts.update((c) => ({ ...c, [type]: value }));
  }

  private readonly submitted = signal(false);
  private readonly rules = computed<Rules>(() => ({
    targetScore: this.targetScore(),
    minimumPoints: this.minimumPoints(),
    fourOfAKindDoubling: this.doubling(),
    cardCounts: this.counts(),
  }));
  private readonly rulesProblem = computed(() => {
    const code = rulesError(this.rules());
    return code && this.i18n.t(`rules.${code}`);
  });
  private readonly problems = computed(() => {
    const [name, password] = [this.name().trim(), this.password()];
    return {
      name: name.length < 1 || name.length > 40 ? this.i18n.t('create.nameError') : null,
      password:
        password.length > 0 && (password.length < 4 || password.length > 64)
          ? this.i18n.t('create.passwordError')
          : null,
      rules: this.rulesProblem(),
    };
  });
  /** Per-field messages, shown after the first submit attempt. */
  protected readonly errors = computed(() =>
    this.submitted() ? this.problems() : { name: null, password: null, rules: null },
  );

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (Object.values(this.problems()).some(Boolean)) return;
    const ack = await this.socket.create({
      name: this.name().trim(),
      password: this.password(),
      seats: this.seats(),
      rules: this.rules(),
    });
    if (!ack.ok) {
      this.error.set(() => errorMessage(ack, this.i18n));
      return;
    }
    // best effort: the lobby shows what was applied, a failed step just leaves fewer computers
    if (this.showPending())
      await applySetup(this.socket, ack.game, this.effectiveComputers(), {
        speed: this.pendingSpeed(),
        fastComputerDice: this.pendingFastDice(),
        showBustProbability: this.pendingShowBust(),
      });
    await this.router.navigate(['/game', ack.game.id]);
  }
}
