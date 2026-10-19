import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { defaultRules, PROTOCOL_VERSION, type Ack, type UiLanguage } from 'game-rules';
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
  private constructor(socket: Socket) {
    this.socket = socket;
    sockets.push(socket);
    socket.onAny((event, payload) => this.pushes.push({ event, payload }));
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
    return this.socket.timeout(2000).emitWithAck(event, payload);
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
