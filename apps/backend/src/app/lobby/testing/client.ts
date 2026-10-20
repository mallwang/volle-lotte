import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  applyChange,
  decodeView,
  defaultRules,
  PROTOCOL_VERSION,
  type Ack,
  type GameView,
  type UiLanguage,
} from 'game-rules';
import { io, type Socket } from 'socket.io-client';
import { GameRegistryService } from '../game-registry.service';
import { LobbyModule } from '../lobby.module';

/** Test helpers shared by the gateway integration tests and the e2e flows. */
let app: INestApplication;
let url: string;
const sockets: Socket[] = [];

/** Starts the lobby module on a random port; pair with `stopApp()`. */
export async function startApp(): Promise<void> {
  const mod = await Test.createTestingModule({ imports: [LobbyModule] }).compile();
  app = mod.createNestApplication();
  await app.listen(0);
  url = await app.getUrl();
}

/** The rooms of the running app, for tests that need a state sockets cannot reach quickly. */
export const registry = (): GameRegistryService => app.get(GameRegistryService);

export async function stopApp(): Promise<void> {
  sockets.forEach((s) => s.close());
  await app.close();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any; // eslint-disable-line sonarjs/redundant-type-aliases

export class Client {
  readonly socket: Socket;
  token = '';
  pushes: { event: string; payload: Any }[] = [];
  /** The client's view as the real client builds it: the last snapshot plus the changes applied to it. */
  view?: GameView;
  /** Every state `view` has had, oldest first. */
  views: GameView[] = [];
  /** Changes this client could not apply because one before them was missing. */
  gaps = 0;
  /** Test hook: `game:change` pushes for which this returns true are lost (not applied). */
  lose?: (change: Any) => boolean;
  private constructor(socket: Socket) {
    this.socket = socket;
    sockets.push(socket);
    socket.onAny((event, payload) => {
      this.pushes.push({ event, payload });
      if (event === 'game:snapshot') this.setView(decodeView(payload.game));
      if (event === 'game:change' && !this.lose?.(payload)) this.applyPushed(payload);
      if (event === 'game:closed') this.view = undefined;
    });
  }
  private setView(view: GameView): void {
    this.view = view;
    this.views.push(view);
  }
  private applyPushed(change: Any): void {
    if (!this.view || change.n <= this.view.n) return;
    if (change.n === this.view.n + 1) this.setView(applyChange(this.view, change));
    else this.gaps++;
  }
  static async connect(): Promise<Client> {
    const socket = io(url, { transports: ['websocket'], forceNew: true });
    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));
    return new Client(socket);
  }
  static async start(
    nickname: string,
    token?: string,
    language: UiLanguage = 'en',
  ): Promise<Client> {
    const c = await Client.connect();
    const ack = await c.send('session:start', {
      nickname,
      token,
      protocolVersion: PROTOCOL_VERSION,
      language,
    });
    c.token = ack.token;
    return c;
  }
  send(event: string, payload?: unknown): Promise<Ack<Any> & Any> {
    // the view is set inside the ack callback: a change in the same chunk must find it
    return new Promise((resolve, reject) =>
      this.socket.timeout(2000).emit(event, payload, (err: Error | null, ack: Any) => {
        if (err) return reject(err);
        if (ack?.ok && ack.game) this.setView(decodeView(ack.game));
        if (event === 'game:leave' && ack?.ok) this.view = undefined;
        resolve(ack);
      }),
    );
  }
  /** Waits for a state of the client's view that matches (any it has had since the start). */
  async untilView(pred: (v: GameView) => boolean = () => true): Promise<GameView> {
    for (let i = 0; i < 100; i++) {
      const hit = this.views.find(pred);
      if (hit) return hit;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error('no matching view');
  }
  async until(event: string, pred: (p: Any) => boolean = () => true): Promise<Any> {
    for (let i = 0; i < 100; i++) {
      const hit = this.pushes.find((p) => p.event === event && pred(p.payload));
      if (hit) return hit.payload;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`no ${event}`);
  }
}

export const create = (c: Client, seats = 3, password = 'secret') =>
  c.send('game:create', { name: 'Table', password, seats, rules: defaultRules() });
