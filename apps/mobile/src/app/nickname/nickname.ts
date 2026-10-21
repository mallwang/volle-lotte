import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { errorMessage } from '../core/error-message';
import { MobileI18nService } from '../core/i18n.service';
import { MobileSocketService } from '../core/mobile-socket.service';
import { TranslatePipe } from '../core/translate.pipe';

const VALID = /^[A-Za-z0-9 _-]{2,20}$/;

@Component({
  selector: 'app-nickname',
  imports: [TranslatePipe],
  template: `
    <form class="card" (submit)="submit($event, input.value)">
      <h2>{{ 'nickname.title' | t }}</h2>
      <label for="nickname">{{ 'nickname.title' | t }}</label>
      <input
        #input
        id="nickname"
        name="nickname"
        [value]="socket.storedNickname"
        autocomplete="nickname"
        maxlength="20"
        [attr.aria-invalid]="error() ? 'true' : null"
        aria-describedby="nickname-error"
      />
      @if (error()) {
        <p id="nickname-error" class="chip bad" role="alert">{{ error() }}</p>
      }
      <button type="submit" class="primary">{{ 'nickname.continue' | t }}</button>
    </form>
  `,
})
export class Nickname {
  protected readonly socket = inject(MobileSocketService);
  private readonly router = inject(Router);
  private readonly i18n = inject(MobileI18nService);
  protected readonly error = signal('');

  protected async submit(event: Event, value: string): Promise<void> {
    event.preventDefault();
    const nickname = value.trim();
    if (!VALID.test(nickname)) {
      this.error.set(this.i18n.t('nickname.invalid'));
      return;
    }
    const ack = await this.socket.start(nickname);
    if (ack.ok) await this.router.navigateByUrl('/');
    else this.error.set(errorMessage(ack, this.i18n));
  }
}
