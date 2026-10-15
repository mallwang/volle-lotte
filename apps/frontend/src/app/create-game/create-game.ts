import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CARD_TYPES, defaultRules, rulesError, type CardType, type Rules } from 'game-rules';
import { errorMessage } from '../core/error-message';
import { SocketService } from '../core/socket.service';

@Component({
  selector: 'app-create-game',
  imports: [FormsModule, RouterLink],
  template: `
    <form (ngSubmit)="submit()">
      <h2>Create game</h2>
      <label>Name <input name="name" [(ngModel)]="name" maxlength="40" /></label>
      <label>
        Password
        <input name="password" type="password" [(ngModel)]="password" autocomplete="off" />
      </label>
      <label>
        Seats
        <input name="seats" type="number" min="2" max="8" [(ngModel)]="seats" />
      </label>
      <fieldset>
        <legend>Rules (fixed once the game is created)</legend>
        <label>
          Target score
          <input name="target" type="number" min="1" [(ngModel)]="targetScore" />
        </label>
        <label>
          Minimum points
          <input name="minimum" type="number" min="0" [(ngModel)]="minimumPoints" />
        </label>
        <label>
          <input name="doubling" type="checkbox" [(ngModel)]="doubling" />
          Four of a kind doubles
        </label>
        @for (t of cardTypes; track t) {
          <label>
            Cards: {{ t }}
            <input
              [name]="'card-' + t"
              type="number"
              min="0"
              [ngModel]="counts()[t]"
              (ngModelChange)="setCount(t, $event)"
            />
          </label>
        }
      </fieldset>
      <button type="submit">Create</button>
      <a routerLink="/lobby">Cancel</a>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
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

  protected async submit(): Promise<void> {
    const name = this.name().trim();
    const password = this.password();
    const seats = this.seats();
    const rules: Rules = {
      targetScore: this.targetScore(),
      minimumPoints: this.minimumPoints(),
      fourOfAKindDoubling: this.doubling(),
      cardCounts: this.counts(),
    };
    const problem = this.problem(name, password, seats, rules);
    if (problem) return this.error.set(problem);
    const ack = await this.socket.create({ name, password, seats, rules });
    if (ack.ok) await this.router.navigate(['/game', ack.game.id]);
    else this.error.set(errorMessage(ack));
  }

  private problem(name: string, password: string, seats: number, rules: Rules): string | null {
    if (name.length < 1 || name.length > 40) return 'Name must have 1-40 characters.';
    if (password.length < 4 || password.length > 64) return 'Password must have 4-64 characters.';
    if (!Number.isInteger(seats) || seats < 2 || seats > 8) return 'Seats must be between 2 and 8.';
    return rulesError(rules);
  }
}
