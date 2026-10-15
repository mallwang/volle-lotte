import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CARD_TYPES, defaultRules, rulesError, type CardType, type Rules } from 'game-rules';
import { errorMessage } from '../core/error-message';
import { SocketService } from '../core/socket.service';

@Component({
  selector: 'app-create-game',
  imports: [FormsModule, RouterLink, ButtonModule, CheckboxModule, InputTextModule, MessageModule],
  template: `
    <form class="vl-form" (ngSubmit)="submit()">
      <h2>Create game</h2>
      <div class="vl-field">
        <label for="name">Name</label>
        <input pInputText id="name" name="name" [(ngModel)]="name" maxlength="40" />
        @if (errors().name; as e) {
          <p-message severity="error" size="small" role="alert">{{ e }}</p-message>
        }
      </div>
      <div class="vl-field">
        <label for="password">Password</label>
        <input
          pInputText
          id="password"
          name="password"
          type="password"
          [(ngModel)]="password"
          autocomplete="off"
        />
        @if (errors().password; as e) {
          <p-message severity="error" size="small" role="alert">{{ e }}</p-message>
        }
      </div>
      <div class="vl-field">
        <label for="seats">Seats</label>
        <input
          pInputText
          id="seats"
          name="seats"
          type="number"
          min="2"
          max="8"
          [(ngModel)]="seats"
        />
        @if (errors().seats; as e) {
          <p-message severity="error" size="small" role="alert">{{ e }}</p-message>
        }
      </div>
      <fieldset class="vl-form">
        <legend>Rules (fixed once the game is created)</legend>
        <div class="vl-field">
          <label for="target">Target score</label>
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
          <label for="minimum">Minimum points</label>
          <input
            pInputText
            id="minimum"
            name="minimum"
            type="number"
            min="0"
            [(ngModel)]="minimumPoints"
          />
        </div>
        <div class="vl-actions">
          <p-checkbox inputId="doubling" name="doubling" [binary]="true" [(ngModel)]="doubling" />
          <label for="doubling">Four of a kind doubles</label>
        </div>
        @for (t of cardTypes; track t) {
          <div class="vl-field">
            <label [for]="'card-' + t">Cards: {{ t }}</label>
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
        @if (errors().rules; as e) {
          <p-message severity="error" size="small" role="alert">{{ e }}</p-message>
        }
      </fieldset>
      <div class="vl-actions">
        <p-button type="submit" label="Create" />
        <a routerLink="/lobby">Cancel</a>
      </div>
      @if (error()) {
        <p-message severity="error" role="alert">{{ error() }}</p-message>
      }
    </form>
  `,
})
export class CreateGame {
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly defaults = defaultRules();
  protected readonly cardTypes = CARD_TYPES;
  protected readonly name = signal('');
  protected readonly password = signal('');
  protected readonly seats = signal(4);
  protected readonly targetScore = signal(this.defaults.targetScore);
  protected readonly minimumPoints = signal(this.defaults.minimumPoints);
  protected readonly doubling = signal(this.defaults.fourOfAKindDoubling);
  protected readonly counts = signal<Record<CardType, number>>({ ...this.defaults.cardCounts });
  protected readonly error = signal('');

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
  private readonly problems = computed(() => {
    const [name, password, seats] = [this.name().trim(), this.password(), this.seats()];
    return {
      name: name.length < 1 || name.length > 40 ? 'Name must have 1-40 characters.' : null,
      password:
        password.length < 4 || password.length > 64 ? 'Password must have 4-64 characters.' : null,
      seats:
        !Number.isInteger(seats) || seats < 2 || seats > 8
          ? 'Seats must be between 2 and 8.'
          : null,
      rules: rulesError(this.rules()),
    };
  });
  /** Per-field messages, shown after the first submit attempt. */
  protected readonly errors = computed(() =>
    this.submitted() ? this.problems() : { name: null, password: null, seats: null, rules: null },
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
    else this.error.set(errorMessage(ack));
  }
}
