import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CARD_TYPES, defaultRules, rulesError, type CardType, type Rules } from 'game-rules';
import { errorMessage } from '../core/error-message';
import { MobileI18nService } from '../core/i18n.service';
import { MobileSocketService } from '../core/mobile-socket.service';
import { TranslatePipe } from '../core/translate.pipe';

const SEATS = [2, 3, 4, 5, 6, 7, 8];

/** Computers are added in the lobby of the new game; presets are deferred. */
@Component({
  selector: 'app-create-game',
  imports: [RouterLink, TranslatePipe],
  template: `
    <form id="create" (submit)="submit($event)">
      <h2>{{ 'create.title' | t }}</h2>
      <label for="game-name">{{ 'create.name' | t }}</label>
      <input
        id="game-name"
        maxlength="40"
        autocomplete="off"
        [value]="name()"
        (input)="name.set($any($event.target).value)"
      />
      @if (errors().name; as e) {
        <p class="chip bad" role="alert">{{ e }}</p>
      }
      <label for="game-password">{{ 'create.password' | t }}</label>
      <input
        id="game-password"
        type="password"
        autocomplete="new-password"
        aria-describedby="game-password-hint"
        [value]="password()"
        (input)="password.set($any($event.target).value)"
      />
      <small id="game-password-hint">{{ 'create.passwordHint' | t }}</small>
      @if (errors().password; as e) {
        <p class="chip bad" role="alert">{{ e }}</p>
      }
      <label for="seats">{{ 'create.seats' | t }}</label>
      <select id="seats" (change)="seats.set(+$any($event.target).value)">
        @for (n of seatOptions; track n) {
          <option [value]="n" [selected]="n === seats()">{{ n }}</option>
        }
      </select>
      <details class="card">
        <summary>{{ 'create.rules' | t }} {{ 'create.rulesFixed' | t }}</summary>
        <label for="target">{{ 'create.target' | t }}</label>
        <input
          id="target"
          type="number"
          inputmode="numeric"
          min="1"
          [value]="rules().targetScore"
          (input)="patch({ targetScore: +$any($event.target).value })"
        />
        <label for="minimum">{{ 'create.minimum' | t }}</label>
        <input
          id="minimum"
          type="number"
          inputmode="numeric"
          min="0"
          [value]="rules().minimumPoints"
          (input)="patch({ minimumPoints: +$any($event.target).value })"
        />
        <label>
          <input
            type="checkbox"
            [checked]="rules().fourOfAKindDoubling"
            (change)="patch({ fourOfAKindDoubling: $any($event.target).checked })"
          />
          {{ 'create.doubling' | t }}
        </label>
        <h3>{{ 'create.cardsPerType' | t }}</h3>
        @for (c of cardTypes; track c) {
          <label [for]="'card-' + c">{{ 'card.' + c | t }}</label>
          <input
            [id]="'card-' + c"
            type="number"
            inputmode="numeric"
            min="0"
            [value]="rules().cardCounts[c]"
            (input)="setCount(c, +$any($event.target).value)"
          />
        }
        @if (errors().rules; as e) {
          <p class="chip bad" role="alert">{{ e }}</p>
        }
      </details>
      @if (error()) {
        <p class="chip bad" role="alert">{{ error() }}</p>
      }
    </form>
    <div class="action-bar">
      <a routerLink="/" class="button">{{ 'create.cancel' | t }}</a>
      <button type="submit" form="create" class="primary">{{ 'create.submit' | t }}</button>
    </div>
  `,
})
export class CreateGame {
  private readonly socket = inject(MobileSocketService);
  private readonly router = inject(Router);
  private readonly i18n = inject(MobileI18nService);
  protected readonly cardTypes = CARD_TYPES;
  protected readonly seatOptions = SEATS;
  protected readonly name = signal(
    this.i18n.t('create.defaultName', { nickname: this.socket.session()?.nickname ?? 'My' }),
  );
  protected readonly password = signal('');
  protected readonly seats = signal(4);
  protected readonly rules = signal<Rules>(defaultRules());
  protected readonly error = signal('');
  private readonly submitted = signal(false);

  private readonly problems = computed(() => {
    const [name, password] = [this.name().trim(), this.password()];
    const code = rulesError(this.rules());
    return {
      name: name.length < 1 || name.length > 40 ? this.i18n.t('create.nameError') : null,
      password:
        password.length > 0 && (password.length < 4 || password.length > 64)
          ? this.i18n.t('create.passwordError')
          : null,
      rules: code ? this.i18n.t(`rules.${code}`) : null,
    };
  });
  /** Per-field messages, shown after the first submit attempt. */
  protected readonly errors = computed(() =>
    this.submitted() ? this.problems() : { name: null, password: null, rules: null },
  );

  protected patch(change: Partial<Rules>): void {
    this.rules.update((r) => ({ ...r, ...change }));
  }

  protected setCount(type: CardType, value: number): void {
    this.rules.update((r) => ({ ...r, cardCounts: { ...r.cardCounts, [type]: value } }));
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);
    if (Object.values(this.problems()).some(Boolean)) return;
    const ack = await this.socket.create({
      name: this.name().trim(),
      password: this.password(),
      seats: this.seats(),
      rules: this.rules(),
    });
    if (ack.ok) await this.router.navigate(['/game', ack.game.id]);
    else this.error.set(errorMessage(ack, this.i18n));
  }
}
