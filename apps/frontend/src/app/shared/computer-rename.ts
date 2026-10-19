import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ErrorAck } from 'game-rules';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { errorMessage, type Msg } from '../core/error-message';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';

/** Host-only inline field to rename one computer seat or roll a new name; the server validates and the new name arrives with the next game state. */
@Component({
  selector: 'app-computer-rename',
  imports: [ButtonModule, FormsModule, TooltipModule, TranslatePipe],
  template: `
    <form class="vl-rename" (ngSubmit)="save()">
      <div class="vl-rename-row">
        <input
          type="text"
          [id]="inputId()"
          name="computerName"
          maxlength="20"
          autocomplete="off"
          [attr.aria-label]="'computerName.label' | t: { name: name() }"
          [ngModel]="draft()"
          (ngModelChange)="draft.set($event)"
          (blur)="save()"
          [attr.aria-invalid]="error() ? 'true' : null"
          [attr.aria-describedby]="error() ? errorId() : null"
        />
        <p-button
          type="button"
          icon="pi pi-refresh"
          severity="secondary"
          size="small"
          [text]="true"
          [ariaLabel]="'computerName.regenerate' | t"
          [pTooltip]="'computerName.regenerate' | t"
          (onClick)="regenerate()"
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

  protected save(): Promise<void> {
    if (!this.changed()) return Promise.resolve();
    return this.rename(this.draft().trim());
  }

  protected regenerate(): Promise<void> {
    return this.rename(undefined);
  }

  private async rename(name: string | undefined): Promise<void> {
    const ack = await this.socket.send('seat:rename', { seat: this.seat(), name });
    this.error.set(ack.ok ? null : () => this.errorText(ack));
  }

  private errorText(ack: ErrorAck): string {
    if (ack.reason === 'invalidNickname') return this.i18n.t('computerName.invalid');
    if (ack.reason === 'nicknameTaken') return this.i18n.t('computerName.taken');
    return errorMessage(ack, this.i18n);
  }
}
