import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { errorMessage } from '../core/error-message';
import { SocketService } from '../core/socket.service';

const VALID = /^[A-Za-z0-9 _-]{2,20}$/;

@Component({
  selector: 'app-nickname',
  imports: [FormsModule],
  template: `
    <form (ngSubmit)="submit()">
      <h2>Nickname</h2>
      <label>
        Nickname
        <input name="nickname" [(ngModel)]="nickname" autocomplete="nickname" maxlength="20" />
      </label>
      <button type="submit">Continue</button>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </form>
  `,
})
export class Nickname {
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  protected readonly nickname = signal(this.socket.storedNickname);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    const nickname = this.nickname().trim();
    if (!VALID.test(nickname)) {
      this.error.set('Nickname must have 2-20 characters: letters, digits, space, _ or -.');
      return;
    }
    const ack = await this.socket.start(nickname);
    if (ack.ok) await this.router.navigateByUrl('/lobby');
    else this.error.set(errorMessage(ack));
  }
}
