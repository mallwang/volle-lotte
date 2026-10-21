import { Component, input, output } from '@angular/core';

export interface TurnAction {
  id: 'draw' | 'throw' | 'select' | 'bank';
  label: string;
  enabled: boolean;
  /** Why it is disabled, shown above the buttons (empty = no visible reason). */
  reason: string;
}

/** Draw, throw, select and bank as thumb-sized buttons; a disabled one explains itself. */
@Component({
  selector: 'app-table-actions',
  template: `
    @if (reason(); as why) {
      <p class="reason" role="status">{{ why }}</p>
    }
    @for (a of actions(); track a.id) {
      <button
        type="button"
        [class.primary]="a.enabled"
        [disabled]="!a.enabled || busy()"
        (click)="run.emit(a.id)"
      >
        {{ a.label }}
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      justify-content: center;
    }
    button {
      min-height: 48px;
      padding: 4px 8px;
      line-height: 1.15;
      touch-action: manipulation;
    }
    .reason {
      margin: 0;
      font-size: 0.8rem;
    }
  `,
})
export class TableActions {
  readonly actions = input.required<readonly TurnAction[]>();
  /** Everything is disabled (not my turn, or an action is in flight). */
  readonly busy = input(false);
  readonly reason = input('');
  readonly run = output<TurnAction['id']>();
}
