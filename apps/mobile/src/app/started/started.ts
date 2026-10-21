import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MobileSocketService } from '../core/mobile-socket.service';
import { TranslatePipe } from '../core/translate.pipe';

/** The phone game table is not built yet (FR-013); point to the desktop site. */
@Component({
  selector: 'app-started',
  imports: [RouterLink, TranslatePipe],
  template: `
    <h2>{{ 'mobile.started.title' | t }}</h2>
    <p>{{ 'mobile.started.body' | t }}</p>
    <div class="bar">
      <a routerLink="/" class="button primary">{{ 'mobile.started.back' | t }}</a>
      <button type="button" class="danger" (click)="leave()">{{ 'game.leave' | t }}</button>
    </div>
  `,
})
export class Started {
  private readonly socket = inject(MobileSocketService);
  private readonly router = inject(Router);

  /** Leaving a running game hands the seat to a computer; the list then offers to rejoin. */
  protected async leave(): Promise<void> {
    if ((await this.socket.leave()).ok) await this.router.navigateByUrl('/');
  }
}
