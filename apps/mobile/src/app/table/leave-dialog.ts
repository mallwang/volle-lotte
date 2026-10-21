import { Component, output } from '@angular/core';
import { TranslatePipe } from '../core/translate.pipe';
import { Modal } from './modal';

/** Confirms leaving a running game; Escape counts as "keep playing". */
@Component({
  selector: 'app-leave-dialog',
  imports: [TranslatePipe, Modal],
  template: `
    <dialog appModal aria-labelledby="leave-title" (cancel)="$event.preventDefault(); back.emit()">
      <h2 id="leave-title">{{ 'mobile.table.leaveTitle' | t }}</h2>
      <p>{{ 'mobile.table.leaveBody' | t }}</p>
      <div class="row">
        <button type="button" autofocus (click)="back.emit()">
          {{ 'mobile.table.leaveBack' | t }}
        </button>
        <button type="button" class="primary" (click)="confirm.emit()">
          {{ 'game.leave' | t }}
        </button>
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      max-width: 24rem;
      border: 1px solid var(--vl-line);
      border-radius: 12px;
      background: var(--vl-surface);
      color: var(--vl-ink);
    }
    .row {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    button {
      min-height: 48px;
    }
  `,
})
export class LeaveDialog {
  readonly confirm = output<void>();
  readonly back = output<void>();
}
