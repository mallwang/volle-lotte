import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { errorMessage } from '../core/error-message';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';

const VALID = /^[A-Za-z0-9 _-]{2,20}$/;

@Component({
  selector: 'app-nickname',
  imports: [FormsModule, ButtonModule, InputTextModule, MessageModule, TranslatePipe],
  template: `
    <form class="vl-form" (ngSubmit)="submit()">
      <h2>{{ 'nickname.title' | t }}</h2>
      <div class="vl-field">
        <label for="nickname">{{ 'nickname.title' | t }}</label>
        <input
          pInputText
          id="nickname"
          name="nickname"
          [(ngModel)]="nickname"
          autocomplete="nickname"
          maxlength="20"
          [attr.aria-invalid]="error() ? 'true' : null"
          aria-describedby="nickname-error"
        />
        @if (error()) {
          <p-message id="nickname-error" severity="error" size="small" role="alert">
            {{ error() }}
          </p-message>
        }
      </div>
      <div class="vl-actions"><p-button type="submit" [label]="'nickname.continue' | t" /></div>
    </form>
  `,
})
export class Nickname {
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  protected readonly nickname = signal(this.socket.storedNickname);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    const nickname = this.nickname().trim();
    if (!VALID.test(nickname)) {
      this.error.set(this.i18n.t('nickname.invalid'));
      return;
    }
    const ack = await this.socket.start(nickname);
    if (ack.ok) await this.router.navigateByUrl('/lobby');
    else this.error.set(errorMessage(ack, this.i18n));
  }
}
