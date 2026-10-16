import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { io } from 'socket.io-client';
import {
  PROTOCOL_VERSION,
  type Ack,
  type GameSummary,
  type GameView,
  type Intents,
  type Pushes,
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
export type Connection = 'connecting' | 'connected' | 'disconnected';
type Stored = { token: string; nickname: string };

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly socket = inject(SOCKET);
  private stored: Stored | null = this.read();
  /** True after a successful session:start on this page; enables replay on reconnect. */
  private active = false;

  readonly session = signal<Session | null>(null);
  readonly games = signal<GameSummary[]>([]);
  readonly game = signal<GameView | null>(null);
  readonly connection = signal<Connection>(this.socket.connected ? 'connected' : 'connecting');
  private readonly messages = inject(MessageService);
  private readonly i18n = inject(I18nService);

  constructor() {
    this.socket.on('connect', () => {
      this.connection.set('connected');
      if (this.active && this.stored) void this.replay(this.stored);
    });
    this.socket.on('disconnect', () => this.connection.set('disconnected'));
    this.socket.on('lobby:games', ((p: Pushes['lobby:games']) => this.games.set(p.games)) as never);
    this.socket.on('game:state', ((p: Pushes['game:state']) => this.game.set(p.game)) as never);
    this.socket.on('session:replaced', (() => {
      this.active = false;
      this.session.set(null);
      this.game.set(null);
      this.notify('warn', this.i18n.t('server.replaced'));
    }) as never);
    this.socket.on('game:closed', ((p: Pushes['game:closed']) => {
      this.game.set(null);
      if (p?.reason === 'banned') this.notify('warn', this.i18n.t('server.banned'));
      else this.notify('info', this.i18n.t('server.closed'));
    }) as never);
  }

  /** Tells the user (server restart, replaced session, closed game); info fades, the rest persists. */
  private notify(severity: 'info' | 'warn' | 'error', detail: string): void {
    this.messages.add({ severity, detail, life: severity === 'info' ? 4000 : undefined });
  }

  /** Nickname saved from an earlier visit, if any. */
  get storedNickname(): string {
    return this.stored?.nickname ?? '';
  }

  send<K extends keyof Intents>(event: K, payload?: Intents[K][0]): Promise<Ack<Intents[K][1]>> {
    return new Promise((resolve) => this.socket.emit(event, payload, resolve));
  }

  async start(nickname: string): Promise<Ack<Intents['session:start'][1]>> {
    if (!this.socket.connected) this.socket.connect();
    const ack = await this.send('session:start', {
      nickname,
      token: this.stored?.token,
      protocolVersion: PROTOCOL_VERSION,
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

  settings(fastComputerDice: boolean) {
    return this.send('game:settings', { fastComputerDice });
  }

  async leave(): Promise<void> {
    const ack = await this.send('game:leave');
    if (ack.ok) {
      this.game.set(null);
      await this.refreshLobby();
    }
  }

  /** Replays session:start after a reconnect; tells the user if the game is gone. */
  private async replay(stored: Stored): Promise<void> {
    const hadGame = this.game() !== null;
    const ack = await this.send('session:start', {
      nickname: stored.nickname,
      token: stored.token,
      protocolVersion: PROTOCOL_VERSION,
    });
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
