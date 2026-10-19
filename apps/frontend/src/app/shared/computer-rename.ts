import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ErrorAck } from 'game-rules';
import { ButtonModule } from 'primeng/button';
import { errorMessage, type Msg } from '../core/error-message';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';

/** Host-only form to rename one computer seat; the server validates and the new name arrives with the next game state. */
@Component({
  selector: 'app-computer-rename',
  imports: [ButtonModule, FormsModule, TranslatePipe],
  template: `
    <form class="vl-rename" (ngSubmit)="save()">
      <label [for]="inputId()">{{ 'computerName.label' | t: { name: name() } }}</label>
      <div class="vl-rename-row">
        <input
          type="text"
          [id]="inputId()"
          name="computerName"
          maxlength="20"
          autocomplete="off"
          [ngModel]="draft()"
          (ngModelChange)="draft.set($event)"
          [attr.aria-invalid]="error() ? 'true' : null"
          [attr.aria-describedby]="error() ? errorId() : null"
        />
        <p-button
          type="submit"
          severity="secondary"
          [label]="'computerName.save' | t"
          [disabled]="!changed()"
        />
      </div>
      @if (error()) {
        <small class="vl-rename-error" role="alert" [id]="errorId()">{{ error()?.() }}</small>
      }
    </form>
  `,
})
export class ComputerRename {
  private readonly socket = inject(SocketService);
  private readonly i18n = inject(I18nService);

  readonly seat = input.required<number>();
  /** Name the server currently shows for this computer. */
  readonly name = input.required<string>();

  protected readonly draft = signal('');
  protected readonly error = signal<Msg | null>(null);
  protected readonly inputId = computed(() => `computer-name-${this.seat()}`);
  protected readonly errorId = computed(() => `computer-name-error-${this.seat()}`);
  protected readonly changed = computed(
    () => this.draft().trim() !== '' && this.draft().trim() !== this.name(),
  );

  constructor() {
    // an update from the server (also from another client) replaces the draft
    effect(() => {
      this.draft.set(this.name());
      this.error.set(null);
    });
  }

  protected async save(): Promise<void> {
    if (!this.changed()) return;
    const ack = await this.socket.send('seat:rename', {
      seat: this.seat(),
      name: this.draft().trim(),
    });
    this.error.set(ack.ok ? null : () => this.errorText(ack));
  }

  private errorText(ack: ErrorAck): string {
    if (ack.reason === 'invalidNickname') return this.i18n.t('computerName.invalid');
    if (ack.reason === 'nicknameTaken') return this.i18n.t('computerName.taken');
    return errorMessage(ack, this.i18n);
  }
}
