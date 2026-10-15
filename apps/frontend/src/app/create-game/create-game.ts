import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CARD_TYPES, defaultRules, rulesError, type CardType, type Rules } from 'game-rules';
import { errorMessage, type Msg } from '../core/error-message';
import { I18nService } from '../core/i18n.service';
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
    SelectButtonModule,
    TranslatePipe,
  ],
  template: `
    <form class="vl-form" (ngSubmit)="submit()">
      <h2>{{ 'create.title' | t }}</h2>
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
            data-bwignore
            data-lpignore="true"
            data-1p-ignore
          />
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
  private readonly defaults = defaultRules();
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
  protected readonly seats = signal(4);
  protected readonly targetScore = signal(this.defaults.targetScore);
  protected readonly minimumPoints = signal(this.defaults.minimumPoints);
  protected readonly doubling = signal(this.defaults.fourOfAKindDoubling);
  protected readonly counts = signal<Record<CardType, number>>({ ...this.defaults.cardCounts });
  protected readonly error = signal<Msg | null>(null);

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
        password.length < 4 || password.length > 64 ? this.i18n.t('create.passwordError') : null,
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
    if (ack.ok) await this.router.navigate(['/game', ack.game.id]);
    else this.error.set(() => errorMessage(ack, this.i18n));
  }
}
