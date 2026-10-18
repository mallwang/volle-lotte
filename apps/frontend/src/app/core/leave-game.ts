import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import type { CanDeactivateFn } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import type { Game } from '../game/game';
import { isHost } from './game-view';
import { I18nService } from './i18n.service';
import { SocketService } from './socket.service';

/** What leaving means right now; `none` needs no confirmation. */
export type LeaveSituation = 'none' | 'running' | 'lobbyHost' | 'lobbyGuest';

/** The one confirmation for leaving a game or lobby (navbar, browser back, in-page buttons). */
@Injectable({ providedIn: 'root' })
export class LeaveGame {
  private readonly socket = inject(SocketService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly i18n = inject(I18nService);
  private pending: Promise<boolean> | null = null;
  private resolvePending: ((leave: boolean) => void) | null = null;

  readonly situation = computed<LeaveSituation>(() => {
    const game = this.socket.game();
    if (!game || game.you.seat < 0) return 'none';
    if (game.phase === 'running') return 'running';
    if (game.phase === 'lobby') return isHost(game) ? 'lobbyHost' : 'lobbyGuest';
    return 'none';
  });
  /** True while the guard runs `socket.leave()`; mutes the `Game` redirect to /lobby. */
  readonly leaving = signal(false);

  constructor() {
    // the game ended, was cancelled or the seat was removed while the dialog is open
    effect(() => {
      if (this.situation() === 'none' && this.pending) {
        this.confirmation.close();
        this.settle(true);
      }
    });
  }

  /** Resolves true when the player may go on (nothing to confirm, or confirmed). */
  confirm(): Promise<boolean> {
    const situation = this.situation();
    if (situation === 'none') return Promise.resolve(true);
    if (this.pending) return this.pending;
    const t = (part: string) => this.i18n.t(`leave.${situation}.${part}`);
    this.pending = new Promise<boolean>((resolve) => {
      this.resolvePending = resolve;
      this.confirmation.confirm({
        header: t('title'),
        message: t('body'),
        acceptLabel: t('confirm'),
        rejectLabel: this.i18n.t('leave.cancel'),
        defaultFocus: 'reject',
        acceptButtonProps: { severity: 'danger' },
        rejectButtonProps: { severity: 'secondary' },
        accept: () => this.settle(true),
        reject: () => this.settle(false),
      });
    });
    return this.pending;
  }

  /** In-page leave buttons: confirm, then leave (the game page redirects to the games list). */
  async request(): Promise<void> {
    if ((await this.confirm()) && this.situation() !== 'none') await this.socket.leave();
  }

  private settle(leave: boolean): void {
    const resolve = this.resolvePending;
    this.pending = null;
    this.resolvePending = null;
    resolve?.(leave);
  }
}

/** Asks before any navigation away from `game/:id` while a lobby or running game would be left. */
export const leaveGameGuard: CanDeactivateFn<Game> = async () => {
  const leave = inject(LeaveGame);
  const socket = inject(SocketService);
  const router = inject(Router); // inject before the first await
  if (!(await leave.confirm())) return false;
  if (leave.situation() === 'none') return true;
  leave.leaving.set(true);
  const left = await socket.leave();
  if (!left) leave.leaving.set(false);
  else {
    // keep the Game redirect muted until the clicked navigation has finished
    const done = router.events.subscribe((e) => {
      if (
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      ) {
        leave.leaving.set(false);
        done.unsubscribe();
      }
    });
  }
  return left;
};
