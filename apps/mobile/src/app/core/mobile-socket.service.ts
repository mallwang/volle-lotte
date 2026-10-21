import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import {
  PROTOCOL_VERSION,
  applyChange,
  decodeView,
  type Ack,
  type Action,
  type GameChange,
  type GameSummary,
  type GameView,
  type Intents,
  type Pushes,
  type SettingChange,
  type WireView,
} from 'game-rules';
import { io } from 'socket.io-client';
import { errorMessage } from './error-message';
import { MobileI18nService } from './i18n.service';

export interface SocketLike {
  connected: boolean;
  on(event: string, handler: (...args: never[]) => void): unknown;
  emit(event: string, ...args: unknown[]): unknown;
  connect(): unknown;
}

/** Same-origin Socket.IO endpoint of the existing backend (also served under `/m/`). */
export const MOBILE_SOCKET = new InjectionToken<SocketLike>('MOBILE_SOCKET', {
  providedIn: 'root',
  factory: () => io({ path: '/socket.io' }) as unknown as SocketLike,
});

/** The identity key shared with the desktop client. */
export const STORAGE_KEY = 'volle-lotte.session';

export interface Session {
  playerId: string;
  nickname: string;
}
type Stored = { token: string; nickname: string };

/** Mobile counterpart of the desktop socket service: identity, lobby list and the current game. */
@Injectable({ providedIn: 'root' })
export class MobileSocketService {
  private readonly socket = inject(MOBILE_SOCKET);
  private readonly i18n = inject(MobileI18nService);
  private stored: Stored | null = this.read();
  /** True after a successful session:start on this page; enables replay on reconnect. */
  private active = false;
  /** A `game:sync` is pending: changes that arrive meanwhile are dropped. */
  private syncing = false;

  readonly protocolVersion = PROTOCOL_VERSION;
  readonly session = signal<Session | null>(null);
  readonly games = signal<GameSummary[]>([]);
  readonly game = signal<GameView | null>(null);
  /** i18n key of the latest server notice (replaced session, closed game), shown by the shell. */
  readonly notice = signal<string | null>(null);
  /** An action is on its way: further actions are ignored until the server answers (no optimistic update). */
  readonly pending = signal(false);
  /** Text of the latest refused action or host setting change, shown by the table. */
  readonly tableNotice = signal<string | null>(null);
  private readonly connected = signal(this.socket.connected);
  /** False between a reconnect and the finished session replay. */
  private readonly synced = signal(true);
  readonly online = computed(() => this.connected() && this.synced());

  constructor() {
    this.socket.on('connect', () => {
      this.connected.set(true);
      if (this.active && this.stored) {
        this.synced.set(false);
        void this.replay(this.stored);
      }
    });
    this.socket.on('disconnect', ((reason: string) => {
      this.connected.set(false);
      // the client retries on its own only after a network problem, not after a server-side close
      if (reason === 'io server disconnect') this.socket.connect();
    }) as never);
    this.socket.on('lobby:games', ((p: Pushes['lobby:games']) => this.games.set(p.games)) as never);
    this.socket.on('game:snapshot', ((p: Pushes['game:snapshot']) => this.adopt(p.game)) as never);
    this.socket.on('game:change', ((c: GameChange) => this.change(c)) as never);
    this.socket.on('game:settingsChanged', ((p: Pushes['game:settingsChanged']) => {
      const last = p.changes.at(-1);
      if (last) this.tableNotice.set(this.settingText(p.by, last));
    }) as never);
    this.socket.on('session:replaced', (() => {
      this.active = false;
      this.session.set(null);
      this.game.set(null);
      this.notice.set('server.replaced');
    }) as never);
    this.socket.on('game:closed', ((p?: Pushes['game:closed']) => {
      this.game.set(null);
      const reason = p?.reason;
      this.notice.set(
        reason === 'banned' || reason === 'ended' || reason === 'spectatingOff'
          ? `server.${reason}`
          : 'server.closed',
      );
    }) as never);
  }

  /** Nickname saved from an earlier visit, if any. */
  get storedNickname(): string {
    return this.stored?.nickname ?? '';
  }

  /** Refuses while offline: socket.io would queue the intent and replay it before the session is back. */
  send<K extends keyof Intents>(event: K, payload?: Intents[K][0]): Promise<Ack<Intents[K][1]>> {
    if (!this.online()) return Promise.resolve({ ok: false, reason: 'offline' });
    return this.emit(event, payload);
  }

  /** Sends a turn action; ignored while one is pending. A refusal becomes `tableNotice`. */
  async action(action: Action): Promise<void> {
    if (this.pending()) return;
    this.pending.set(true);
    const ack = await this.send('turn:action', { action });
    this.pending.set(false);
    if (!ack.ok) this.tableNotice.set(errorMessage(ack, this.i18n));
  }

  /** Shares the ticked dice with the table; not blocked by `pending`, failures are not worth a message. */
  preview(dice: number[]): void {
    void this.send('turn:preview', { dice });
  }

  async start(nickname: string): Promise<Ack<Intents['session:start'][1]>> {
    if (!this.socket.connected) this.socket.connect();
    const ack = await this.emit('session:start', this.credentials(nickname, this.stored?.token));
    if (ack.ok) {
      this.signedIn(ack);
      await this.refreshLobby();
    }
    return ack;
  }

  /** Resumes the stored identity (page reload); false if there is none or it failed. */
  async resume(): Promise<boolean> {
    return this.stored ? (await this.start(this.stored.nickname)).ok : false;
  }

  async refreshLobby(): Promise<void> {
    const ack = await this.send('lobby:list');
    if (ack.ok) this.games.set(ack.games);
  }

  async create(payload: Intents['game:create'][0]): Promise<Ack<Intents['game:create'][1]>> {
    const ack = await this.send('game:create', payload);
    if (ack.ok) this.adopt(ack.game);
    return ack;
  }

  async join(payload: Intents['game:join'][0]): Promise<Ack<Intents['game:join'][1]>> {
    const ack = await this.send('game:join', payload);
    if (ack.ok) this.adopt(ack.game);
    return ack;
  }

  async rejoin(gameId: string): Promise<Ack<Intents['game:rejoin'][1]>> {
    const ack = await this.send('game:rejoin', { gameId });
    if (ack.ok) this.adopt(ack.game);
    return ack;
  }

  /** Resolves true once the server accepted the leave. */
  async leave(): Promise<Ack> {
    const ack = await this.send('game:leave');
    if (ack.ok) {
      this.game.set(null);
      await this.refreshLobby();
    }
    return ack;
  }

  private emit<K extends keyof Intents>(
    event: K,
    payload?: Intents[K][0],
  ): Promise<Ack<Intents[K][1]>> {
    return new Promise((resolve) => this.socket.emit(event, payload, resolve));
  }

  private settingText(who: string, c: SettingChange): string {
    if (c.setting === 'computerSpeed')
      return this.i18n.t('toast.setting.computerSpeed', {
        who,
        step: String(c.value),
        name: this.i18n.t(`settings.computerSpeed.${c.value}`),
      });
    return this.i18n.t(`toast.setting.${c.setting}.${c.value ? 'on' : 'off'}`, { who });
  }

  private credentials(nickname: string, token?: string) {
    return { nickname, token, protocolVersion: PROTOCOL_VERSION, language: this.i18n.lang() };
  }

  private signedIn(ack: Extract<Ack<Intents['session:start'][1]>, { ok: true }>): void {
    this.stored = { token: ack.token, nickname: ack.nickname };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stored));
    this.active = true;
    this.notice.set(null);
    this.session.set({ playerId: ack.playerId, nickname: ack.nickname });
    if (ack.game) this.adopt(ack.game);
    else this.game.set(null);
  }

  /** The log arrives compact and is decoded here. */
  private adopt(view: WireView): void {
    this.game.set(decodeView(view));
  }

  /** Applies the next change; a gap asks for a fresh snapshot (changes are dropped meanwhile). */
  private change(change: GameChange): void {
    const view = this.game();
    if (!view || this.syncing || change.n <= view.n) return;
    if (change.n === view.n + 1) this.game.set(applyChange(view, change));
    else void this.resync();
  }

  private async resync(): Promise<void> {
    if (!this.online()) return; // the session replay delivers the snapshot
    this.syncing = true;
    const ack = await this.emit('game:sync');
    this.syncing = false;
    if (ack.ok) {
      if (this.game()) this.adopt(ack.game);
    } else if (ack.reason === 'notInGame' || ack.reason === 'gameNotFound') this.game.set(null);
  }

  /** Replays session:start after a reconnect. */
  private async replay(stored: Stored): Promise<void> {
    const ack = await this.emit('session:start', this.credentials(stored.nickname, stored.token));
    this.synced.set(true);
    if (!ack.ok) {
      this.active = false;
      this.session.set(null);
      this.game.set(null);
      return;
    }
    this.signedIn(ack);
    await this.refreshLobby();
  }

  private read(): Stored | null {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      return typeof v?.token === 'string' && typeof v?.nickname === 'string' ? v : null;
    } catch {
      return null;
    }
  }
}
