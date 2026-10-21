import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import type { GameSummary } from 'game-rules';
import { errorMessage } from '../core/error-message';
import { MobileI18nService } from '../core/i18n.service';
import { MobileSocketService } from '../core/mobile-socket.service';
import { TranslatePipe } from '../core/translate.pipe';

/** Bottom sheet in portrait, centred card in landscape. Password errors stay here; others close it. */
@Component({
  selector: 'app-join-dialog',
  imports: [TranslatePipe],
  template: `
    <dialog #dialog (cancel)="closed.emit('')">
      <form
        (submit)="
          $event.preventDefault(); submit($any($event.target).elements.password?.value ?? '')
        "
      >
        <h3>{{ 'lobby.joinTitle' | t: { name: game().name } }}</h3>
        @if (game().protected) {
          <label for="password">{{ 'lobby.passwordFor' | t: { name: game().name } }}</label>
          <input id="password" name="password" type="password" autocomplete="off" required />
        }
        @if (error()) {
          <p class="chip bad" role="alert">{{ error() }}</p>
        }
        <div class="row">
          <button type="button" (click)="closed.emit('')">{{ 'create.cancel' | t }}</button>
          <button type="submit" class="primary" [disabled]="busy()">{{ 'lobby.join' | t }}</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    dialog {
      width: 100%;
      max-width: 480px;
      margin: auto auto 0;
      border: 0;
      border-radius: 16px 16px 0 0;
      padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
      background: var(--vl-bg);
      color: var(--vl-ink);
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 50%);
    }
    @media (orientation: landscape) {
      dialog {
        margin: auto;
        border-radius: 16px;
        max-height: 90dvh;
        overflow-y: auto;
      }
    }
    h3 {
      margin: 0 0 8px;
    }
    input {
      display: block;
      width: 100%;
      box-sizing: border-box;
      min-height: 44px;
    }
    .row {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .row > * {
      flex: 1;
    }
  `,
})
export class JoinDialog {
  readonly game = input.required<GameSummary>();
  /** Emits an error message to show on the list, or an empty string for a plain dismissal. */
  readonly closed = output<string>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly socket = inject(MobileSocketService);
  private readonly router = inject(Router);
  private readonly i18n = inject(MobileI18nService);
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected async submit(password: string): Promise<void> {
    this.busy.set(true);
    const ack = await this.socket.join({ gameId: this.game().id, password });
    this.busy.set(false);
    if (ack.ok) {
      await this.router.navigate(['/game', this.game().id]);
      return;
    }
    const message = errorMessage(ack, this.i18n);
    if (ack.reason === 'wrongPassword' || ack.reason === 'locked') this.error.set(message);
    else this.closed.emit(message);
  }
}
