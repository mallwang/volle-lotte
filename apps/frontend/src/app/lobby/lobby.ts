import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { GameSummary } from 'game-rules';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { errorMessage, type Msg } from '../core/error-message';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';

const HOST_CHANGED_TOAST_MS = 10_000;

@Component({
  selector: 'app-lobby',
  host: { class: 'vl-narrow' },
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    TagModule,
    TranslatePipe,
  ],
  template: `
    <div class="vl-page-header">
      <h2>{{ 'lobby.title' | t }}</h2>
      <a routerLink="/create-game" class="p-button p-component">{{ 'lobby.create' | t }}</a>
    </div>
    @if (socket.games().length === 0) {
      <p class="vl-empty"><i class="pi pi-inbox" aria-hidden="true"></i> {{ 'lobby.empty' | t }}</p>
    }
    @if (error() && !selectedGame()) {
      <p-message severity="error" role="alert">{{ error()?.() }}</p-message>
    }
    <ul class="vl-cards">
      @for (g of socket.games(); track g.id) {
        <li>
          <p-card
            [header]="g.name"
            [subheader]="g.host ? ('lobby.host' | t: { name: g.host }) : ('lobby.noHost' | t)"
          >
            <p>
              {{
                'lobby.summary'
                  | t: { target: g.targetScore, used: g.seatsUsed, total: g.seatsTotal }
              }}
              <p-tag
                [value]="
                  g.seatsUsed < g.seatsTotal
                    ? ('lobby.free' | t: { n: g.seatsTotal - g.seatsUsed })
                    : ('lobby.full' | t)
                "
                [icon]="g.seatsUsed < g.seatsTotal ? 'pi pi-user-plus' : 'pi pi-ban'"
                [severity]="g.seatsUsed < g.seatsTotal ? 'success' : 'secondary'"
              />
              @if (g.protected) {
                <i
                  class="pi pi-lock"
                  role="img"
                  [attr.aria-label]="'lobby.passwordProtected' | t"
                ></i>
              } @else {
                <p-tag [value]="'lobby.open' | t" icon="pi pi-lock-open" severity="success" />
              }
            </p>
            @if (g.banned) {
              <p-message severity="error" role="alert">{{ 'error.banned' | t }}</p-message>
            } @else if (g.phase === 'lobby') {
              @if (g.seatsUsed < g.seatsTotal) {
                <p-button [label]="'lobby.join' | t" (onClick)="open(g, $event)" />
              }
            } @else if (g.rejoinable || g.closable) {
              <div class="vl-actions">
                @if (g.rejoinable) {
                  <p-button [label]="'lobby.rejoin' | t" (onClick)="rejoin(g)" />
                }
                @if (g.closable) {
                  <p-button
                    [label]="'lobby.end' | t"
                    severity="danger"
                    [outlined]="true"
                    (onClick)="end(g)"
                  />
                }
              </div>
            } @else {
              <p-tag [value]="'lobby.running' | t" icon="pi pi-play" severity="info" />
            }
            @if (g.spectatable && !g.banned && !g.rejoinable && !g.closable) {
              <p-button
                [label]="'lobby.watch' | t"
                icon="pi pi-eye"
                severity="secondary"
                [outlined]="true"
                (onClick)="open(g, $event, true)"
              />
            }
          </p-card>
        </li>
      }
    </ul>
    <p-dialog
      [visible]="!!selectedGame()"
      (visibleChange)="!$event && close()"
      [modal]="true"
      [header]="
        (watching() ? 'lobby.watchTitle' : 'lobby.joinTitle')
          | t: { name: selectedGame()?.name ?? '' }
      "
      appendTo="self"
      [style]="{ width: '24rem', maxWidth: '95vw' }"
    >
      <form class="vl-form" (ngSubmit)="join(selectedGame()!)">
        <label class="vl-field">
          {{ 'lobby.passwordFor' | t: { name: selectedGame()?.name ?? '' } }}
          <input
            pInputText
            name="password"
            type="password"
            [(ngModel)]="password"
            autocomplete="off"
          />
        </label>
        @if (retry() > 0) {
          <p-message severity="warn" role="status">{{
            'lobby.locked' | t: { n: retry() }
          }}</p-message>
        }
        @if (error() && retry() === 0) {
          <p-message severity="error" role="alert">{{ error()?.() }}</p-message>
        }
        <div class="vl-actions">
          <p-button
            type="submit"
            [label]="(watching() ? 'lobby.watch' : 'lobby.enter') | t"
            [disabled]="retry() > 0"
          />
        </div>
      </form>
    </p-dialog>
  `,
})
export class Lobby {
  protected readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  protected readonly selected = signal<string | null>(null);
  protected readonly selectedGame = computed(
    () => this.socket.games().find((g) => g.id === this.selected()) ?? null,
  );
  protected readonly password = signal('');
  /** The open password dialog is for watching, not for joining. */
  protected readonly watching = signal(false);
  protected readonly error = signal<Msg | null>(null);
  protected readonly retry = signal(0);
  /** Game whose end confirmation is open. */
  private readonly ending = signal<string | null>(null);
  private timer?: ReturnType<typeof setInterval>;
  private trigger?: HTMLElement;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
    // another player rejoined (and became host) or the game vanished while the confirmation is open
    effect(() => {
      const id = this.ending();
      if (!id) return;
      const game = this.socket.games().find((g) => g.id === id);
      if (game?.closable) return;
      this.confirmation.close();
      this.ending.set(null);
      this.showEndFailure(game);
    });
  }

  /** Open games are joined with one tap, protected ones ask for the password first. */
  protected open(g: GameSummary, event: Event, watch = false): void {
    this.trigger = (event.target as HTMLElement).closest('button') ?? undefined;
    this.error.set(null);
    this.watching.set(watch);
    if (g.protected) this.selected.set(g.id);
    else void this.join(g);
  }

  protected close(): void {
    this.selected.set(null);
    this.password.set('');
    this.trigger?.focus();
  }

  protected async join(g: GameSummary): Promise<void> {
    const payload = { gameId: g.id, password: this.password() };
    const ack = this.watching()
      ? await this.socket.spectate(payload)
      : await this.socket.join(payload);
    if (ack.ok) {
      this.password.set('');
      await this.router.navigate(['/game', g.id]);
    } else {
      this.error.set(() => errorMessage(ack, this.i18n));
      if (ack.reason === 'locked') this.lock(Math.ceil((ack.retryAfterMs ?? 0) / 1000));
    }
  }

  protected async rejoin(g: GameSummary): Promise<void> {
    const ack = await this.socket.rejoin(g.id);
    if (ack.ok) await this.router.navigate(['/game', g.id]);
    else this.error.set(() => errorMessage(ack, this.i18n));
  }

  protected end(g: GameSummary): void {
    this.error.set(null);
    this.ending.set(g.id);
    this.confirmation.confirm({
      header: this.i18n.t('lobby.endTitle'),
      message: this.i18n.t('lobby.endBody', { game: g.name }),
      acceptLabel: this.i18n.t('lobby.end'),
      rejectLabel: this.i18n.t('lobby.endKeep'),
      defaultFocus: 'reject',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: () => void this.confirmEnd(g),
      reject: () => this.ending.set(null),
    });
  }

  private async confirmEnd(g: GameSummary): Promise<void> {
    this.ending.set(null);
    const ack = await this.socket.end(g.id);
    if (ack.ok) return;
    if (ack.reason !== 'notHost') {
      this.error.set(() => errorMessage(ack, this.i18n));
      return;
    }
    await this.socket.refreshLobby();
    this.showEndFailure(this.socket.games().find((x) => x.id === g.id));
  }

  /** Shown inline; a host change is also announced as a toast that fades after 10 s. */
  private showEndFailure(game: GameSummary | undefined): void {
    if (!game) {
      this.error.set(() => this.i18n.t('error.gameNotFound'));
    } else if (!game.host) {
      this.error.set(() => this.i18n.t('error.notHost'));
    } else {
      const text = () => this.i18n.t('lobby.hostChanged', { game: game.name, host: game.host });
      this.error.set(text);
      this.messages.add({ severity: 'warn', detail: text(), life: HOST_CHANGED_TOAST_MS });
    }
  }

  private lock(seconds: number): void {
    this.retry.set(seconds);
    this.timer = setInterval(() => {
      this.retry.update((n) => Math.max(0, n - 1));
      if (this.retry() === 0) clearInterval(this.timer);
    }, 1000);
  }
}
