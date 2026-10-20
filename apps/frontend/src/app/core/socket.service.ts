import {
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { io } from 'socket.io-client';
import {
  PROTOCOL_VERSION,
  applyChange,
  type Ack,
  type GameChange,
  type GameSummary,
  type GameView,
  type Intents,
  type Pushes,
  type SettingChange,
} from 'game-rules';
import { errorMessage } from './error-message';
import { I18nService } from './i18n.service';

/** The subset of the socket.io client the service uses (replaceable in tests). */
export interface SocketLike {
  connected: boolean;
  on(event: string, listener: (...args: never[]) => void): unknown;
  emit(event: string, ...args: unknown[]): unknown;
  connect(): unknown;
}

export const SOCKET = new InjectionToken<SocketLike>('SOCKET', {
  providedIn: 'root',
  factory: () => io({ path: '/socket.io' }) as unknown as SocketLike,
});

/** The single localStorage key holding the identity. */
export const STORAGE_KEY = 'volle-lotte.session';

export interface Session {
  playerId: string;
  nickname: string;
}
export type Connection = 'connecting' | 'connected' | 'reconnecting' | 'failed';
type Stored = { token: string; nickname: string };

/** How long every self-closing toast stays visible. */
export const TOAST_MS = 6000;

/** Toast key of the connection notice; it has its own toast outlet so it never mixes with the others. */
export const CONNECTION_KEY = 'connection';
/** A shorter drop is not announced (tab switch, network hiccup). */
export const LOST_DELAY_MS = 1500;
/** Without a connection for this long, the user is asked to reload (retries continue meanwhile). */
export const FAIL_AFTER_MS = 20000;
/** How long "connection restored" stays visible. */
export const RESTORED_MS = 5000;

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly socket = inject(SOCKET);
  private stored: Stored | null = this.read();
  /** True after a successful session:start on this page; enables replay on reconnect. */
  private active = false;
  /** A `game:sync` is pending: changes that arrive meanwhile are dropped. */
  private syncing = false;

  readonly session = signal<Session | null>(null);
  readonly games = signal<GameSummary[]>([]);
  readonly game = signal<GameView | null>(null);
  readonly connection = signal<Connection>(this.socket.connected ? 'connected' : 'connecting');
  /** False between a reconnect and the finished session replay, when the server does not know us yet. */
  private readonly synced = signal(true);
  /** Whether intents can be sent now; the UI is locked while a signed-in user is offline. */
  readonly online = computed(() => this.connection() === 'connected' && this.synced());
  private lostTimer: ReturnType<typeof setTimeout> | undefined;
  private failTimer: ReturnType<typeof setTimeout> | undefined;
  /** A connection toast is on screen, so the recovery has to be announced. */
  private announced = false;
  private readonly messages = inject(MessageService);
  private readonly i18n = inject(I18nService);

  constructor() {
    // the server names new computers in the host's language, so it must follow every switch
    effect(() => {
      const language = this.i18n.lang();
      if (this.active && this.socket.connected)
        untracked(() => void this.send('session:language', { language }));
    });
    this.socket.on('connect', () => {
      this.connection.set('connected');
      this.endOutage();
      if (this.active && this.stored) {
        this.synced.set(false);
        void this.replay(this.stored);
      }
    });
    this.socket.on('disconnect', ((reason: string) => {
      this.connection.set('reconnecting');
      // the client only retries on its own after a network problem, not after a server-side close
      if (reason === 'io server disconnect') this.socket.connect();
      this.beginOutage(true);
    }) as never);
    if (this.connection() === 'connecting') this.beginOutage(false);
    this.socket.on('lobby:games', ((p: Pushes['lobby:games']) => this.games.set(p.games)) as never);
    this.socket.on('game:snapshot', ((p: Pushes['game:snapshot']) =>
      this.game.set(p.game)) as never);
    this.socket.on('game:change', ((c: GameChange) => this.change(c)) as never);
    this.socket.on('game:settingsChanged', ((p: Pushes['game:settingsChanged']) => {
      for (const c of p.changes) this.notify('info', this.settingText(p.by, c));
    }) as never);
    this.socket.on('session:replaced', (() => {
      this.active = false;
      this.session.set(null);
      this.game.set(null);
      this.notify('warn', this.i18n.t('server.replaced'));
    }) as never);
    this.socket.on('game:closed', ((p: Pushes['game:closed']) => {
      this.game.set(null);
      if (p?.reason === 'banned') this.notify('warn', this.i18n.t('server.banned'));
      else if (p?.reason === 'ended') this.notify('info', this.i18n.t('server.ended'));
      else if (p?.reason === 'spectatingOff')
        this.notify('info', this.i18n.t('server.spectatingOff'));
      else this.notify('info', this.i18n.t('server.closed'));
    }) as never);
  }

  /**
   * Applies the next change; ignores one that is already in the view; asks for a new snapshot when
   * one is missing (only this client pays for it). Changes are dropped while that is pending.
   */
  private change(change: GameChange): void {
    const view = this.game();
    if (!view || this.syncing || change.n <= view.n) return;
    if (change.n === view.n + 1) this.game.set(applyChange(view, change));
    else void this.resync();
  }

  private async resync(): Promise<void> {
    // after a reconnect the session replay delivers the snapshot
    if (!this.socket.connected || !this.synced()) return;
    this.syncing = true;
    const ack = await this.emit('game:sync');
    this.syncing = false;
    if (ack.ok) {
      if (this.game()) this.game.set(ack.game);
    } else if (ack.reason === 'notInGame' || ack.reason === 'gameNotFound') {
      this.game.set(null);
      this.notify('error', errorMessage(ack, this.i18n));
    }
  }

  private beginOutage(announceLoss: boolean): void {
    clearTimeout(this.lostTimer);
    clearTimeout(this.failTimer);
    if (announceLoss)
      this.lostTimer = setTimeout(
        () => this.showConnection('warn', 'connection.lost'),
        LOST_DELAY_MS,
      );
    this.failTimer = setTimeout(() => {
      this.connection.set('failed');
      this.showConnection('error', 'connection.failed', true);
    }, FAIL_AFTER_MS);
  }

  private endOutage(): void {
    clearTimeout(this.lostTimer);
    clearTimeout(this.failTimer);
    if (!this.announced) return;
    this.announced = false;
    this.messages.clear(CONNECTION_KEY);
    this.messages.add({
      key: CONNECTION_KEY,
      severity: 'success',
      detail: this.i18n.t('connection.restored'),
      life: RESTORED_MS,
    });
  }

  /** Replaces the connection toast; the failure one stays and offers a reload. */
  private showConnection(severity: 'warn' | 'error', text: string, reload = false): void {
    this.announced = true;
    this.messages.clear(CONNECTION_KEY);
    this.messages.add({
      key: CONNECTION_KEY,
      severity,
      detail: this.i18n.t(text),
      sticky: true,
      closable: false,
      data: { reload },
    });
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

  /** Tells the user (server restart, replaced session, closed game); info fades, the rest persists. */
  private notify(severity: 'info' | 'warn' | 'error', detail: string): void {
    this.messages.add({ severity, detail, life: severity === 'info' ? TOAST_MS : undefined });
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

  private emit<K extends keyof Intents>(
    event: K,
    payload?: Intents[K][0],
  ): Promise<Ack<Intents[K][1]>> {
    return new Promise((resolve) => this.socket.emit(event, payload, resolve));
  }

  async start(nickname: string): Promise<Ack<Intents['session:start'][1]>> {
    if (!this.socket.connected) this.socket.connect();
    const ack = await this.emit('session:start', {
      nickname,
      token: this.stored?.token,
      protocolVersion: PROTOCOL_VERSION,
      language: this.i18n.lang(),
    });
    if (ack.ok) {
      this.stored = { token: ack.token, nickname: ack.nickname };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stored));
      this.active = true;
      this.messages.clear();
      this.session.set({ playerId: ack.playerId, nickname: ack.nickname });
      this.game.set(ack.game ?? null);
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
    if (ack.ok) this.game.set(ack.game);
    return ack;
  }

  async join(payload: Intents['game:join'][0]): Promise<Ack<Intents['game:join'][1]>> {
    const ack = await this.send('game:join', payload);
    if (ack.ok) this.game.set(ack.game);
    return ack;
  }

  async spectate(payload: Intents['game:spectate'][0]): Promise<Ack<Intents['game:spectate'][1]>> {
    const ack = await this.send('game:spectate', payload);
    if (ack.ok) this.game.set(ack.game);
    return ack;
  }

  async rejoin(gameId: string): Promise<Ack<Intents['game:rejoin'][1]>> {
    const ack = await this.send('game:rejoin', { gameId });
    if (ack.ok) this.game.set(ack.game);
    return ack;
  }

  /** Host of a finished game: reopens the room as a lobby; the lobby view arrives as a push. */
  async rematch(): Promise<boolean> {
    const game = this.game();
    if (!game) return false;
    const ack = await this.send('rematch:start', { round: game.round });
    if (!ack.ok) this.notify('error', errorMessage(ack, this.i18n));
    return ack.ok;
  }

  /** A player waiting after a rematch takes their reserved seat and sees the lobby. */
  async rejoinRematch(): Promise<boolean> {
    const game = this.game();
    if (!game) return false;
    const ack = await this.send('rematch:join', { round: game.round });
    if (ack.ok) this.game.set(ack.game);
    else this.notify('error', errorMessage(ack, this.i18n));
    return ack.ok;
  }

  /** The last host ends a game that only has computers left; a failure is up to the caller. */
  end(gameId: string): Promise<Ack> {
    return this.send('game:end', { gameId });
  }

  async settings(patch: Intents['game:settings'][0]) {
    const ack = await this.send('game:settings', patch);
    if (!ack.ok) this.notify('error', errorMessage(ack, this.i18n));
    return ack;
  }

  pause(paused: boolean) {
    return this.send('game:pause', { paused });
  }

  /** Resolves true once the server accepted the leave; a rejection is shown as an error toast. */
  async leave(): Promise<boolean> {
    const ack = await this.send('game:leave');
    if (!ack.ok) {
      this.notify('error', errorMessage(ack, this.i18n));
      return false;
    }
    this.game.set(null);
    await this.refreshLobby();
    return true;
  }

  /** Replays session:start after a reconnect; tells the user if the game is gone. */
  private async replay(stored: Stored): Promise<void> {
    // a finished game is not restored on purpose, so losing it is no news
    const hadGame = this.game() !== null && this.game()?.phase !== 'finished';
    const ack = await this.emit('session:start', {
      nickname: stored.nickname,
      token: stored.token,
      protocolVersion: PROTOCOL_VERSION,
      language: this.i18n.lang(),
    });
    this.synced.set(true);
    if (!ack.ok) {
      this.active = false;
      this.session.set(null);
      this.game.set(null);
      this.notify('error', errorMessage(ack, this.i18n));
      return;
    }
    this.stored = { token: ack.token, nickname: ack.nickname };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stored));
    this.session.set({ playerId: ack.playerId, nickname: ack.nickname });
    if (ack.game) this.game.set(ack.game);
    else {
      this.game.set(null);
      if (hadGame) this.notify('warn', this.i18n.t('server.restarted'));
    }
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
