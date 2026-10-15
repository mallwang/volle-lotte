import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  PROTOCOL_VERSION,
  rulesError,
  type Ack,
  type Action,
  type Difficulty,
  type ErrorReason,
  type Intents,
  type LogEntry,
  type Pushes,
  type Rules,
} from 'game-rules';
import { AttemptLimiter } from './attempt-limiter';
import { GameRegistryService } from './game-registry.service';
import type { GameRoom, Res } from './game-room';
import { hashPassword, verifyPassword } from './password';
import { SessionsService, validNickname, type Session } from './sessions.service';
import { toView } from './view';

const LOBBY = 'lobby';
const DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'random']);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const isInt = (x: unknown, min: number, max: number): x is number =>
  Number.isInteger(x) && (x as number) >= min && (x as number) <= max;
const isPassword = (x: unknown): x is string =>
  typeof x === 'string' && x.length >= 4 && x.length <= 64;
const isDifficulty = (x: unknown): x is Difficulty | undefined =>
  x === undefined || DIFFICULTIES.has(x as string);
const isAction = (x: unknown): x is Action =>
  isObj(x) &&
  (['draw', 'throw', 'bank'].includes(x['type'] as string) ||
    (x['type'] === 'select' &&
      Array.isArray(x['dice']) &&
      x['dice'].every((d) => Number.isInteger(d))));

const bad = (reason: ErrorReason): Ack<never> => ({ ok: false, reason });
const done = <T extends object>(r: Res<T>): Ack<Omit<T, 'ok'>> =>
  r.ok ? r : { ok: false, reason: r.reason, ...(r.engine && { engine: r.engine }) };

@WebSocketGateway()
export class LobbyGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly limiter = new AttemptLimiter();
  private readonly summaries = new Map<string, string>();

  constructor(
    private readonly sessions: SessionsService,
    private readonly registry: GameRegistryService,
  ) {
    registry.onChange = (room, entries) => this.push(room, entries);
    registry.onClosed = (room, reason) => this.closed(room, reason);
  }

  handleDisconnect(client: Socket): void {
    const session = this.sessions.detach(client.id);
    const room = session?.gameId ? this.registry.get(session.gameId) : undefined;
    room?.setConnected(session?.playerId ?? '', false);
  }

  // ---- session and lobby

  @SubscribeMessage('session:start')
  start(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Ack<Intents['session:start'][1]> {
    if (!isObj(body) || !isInt(body['protocolVersion'], 0, 1e6)) return bad('invalidRequest');
    if (body['protocolVersion'] !== PROTOCOL_VERSION) return bad('versionMismatch');
    const token = body['token'];
    let session = typeof token === 'string' ? this.sessions.byTokenValue(token) : undefined;
    if (!session) {
      const nickname = validNickname(body['nickname']);
      if (!nickname) return bad('invalidNickname');
      session = this.sessions.create(nickname);
    }
    const replaced = this.sessions.attach(session, client.id);
    if (replaced) {
      this.emitTo(replaced, 'session:replaced', undefined);
      this.server.sockets.sockets.get(replaced)?.disconnect(true);
    }
    let game;
    const room = session.gameId ? this.registry.get(session.gameId) : undefined;
    if (room && room.seatOf(session.playerId) >= 0) {
      void client.leave(LOBBY);
      room.setConnected(session.playerId, true);
      game = toView(room, session.playerId);
    } else {
      session.gameId = undefined;
      void client.join(LOBBY);
    }
    return {
      ok: true,
      token: session.token,
      playerId: session.playerId,
      nickname: session.nickname,
      protocolVersion: PROTOCOL_VERSION,
      ...(game && { game }),
    };
  }

  @SubscribeMessage('lobby:list')
  list(@ConnectedSocket() client: Socket): Ack<Intents['lobby:list'][1]> {
    return this.session(client) ? { ok: true, games: this.registry.list() } : bad('noSession');
  }

  @SubscribeMessage('game:create')
  create(
    @ConnectedSocket() client: Socket,
    @MessageBody() b: unknown,
  ): Ack<Intents['game:create'][1]> {
    const session = this.session(client);
    if (!session) return bad('noSession');
    if (this.roomOf(session)) return bad('alreadyInGame');
    if (!isObj(b)) return bad('invalidRequest');
    const name = typeof b['name'] === 'string' ? b['name'].trim() : '';
    if (name.length < 1 || name.length > 40 || !isInt(b['seats'], 2, 8) || !isObj(b['rules'])) {
      return bad('invalidRequest');
    }
    if (!isPassword(b['password'])) return bad('invalidPassword');
    if (rulesError(b['rules']) !== null) return bad('invalidRequest');
    const room = this.registry.create({
      name,
      passwordHash: hashPassword(b['password']),
      rules: b['rules'] as unknown as Rules,
      seatCount: b['seats'],
      host: { playerId: session.playerId, nickname: session.nickname },
    });
    this.enter(client, session, room);
    this.pushLobby();
    return { ok: true, game: toView(room, session.playerId) };
  }

  @SubscribeMessage('game:join')
  join(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack<Intents['game:join'][1]> {
    const session = this.session(client);
    if (!session) return bad('noSession');
    if (this.roomOf(session)) return bad('alreadyInGame');
    if (!isObj(b) || typeof b['gameId'] !== 'string') return bad('invalidRequest');
    if (b['seat'] !== undefined && !isInt(b['seat'], 0, 7)) return bad('invalidRequest');
    if (!isPassword(b['password'])) return bad('invalidPassword');
    const room = this.registry.get(b['gameId']);
    if (!room) return bad('gameNotFound');
    const key = this.clientKey(client);
    const wait = this.limiter.retryAfterMs(key, room.id);
    if (wait > 0) return { ok: false, reason: 'locked', retryAfterMs: wait };
    if (!verifyPassword(b['password'], room.passwordHash)) {
      return { ok: false, reason: 'wrongPassword', attemptsLeft: this.limiter.fail(key, room.id) };
    }
    this.limiter.succeed(key, room.id);
    const joined = room.join(session.playerId, session.nickname, b['seat'] as number | undefined);
    if (!joined.ok) return done(joined) as Ack<never>;
    this.enter(client, session, room);
    this.pushLobby();
    return { ok: true, game: toView(room, session.playerId) };
  }

  // ---- inside a game

  @SubscribeMessage('game:leave')
  leave(@ConnectedSocket() client: Socket): Ack {
    return this.inRoom(client, (room, session) => {
      const left = room.leave(session.playerId);
      if (left.ok) this.exit(session);
      return left;
    });
  }

  @SubscribeMessage('seat:set')
  seat(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    if (
      !isObj(b) ||
      !isInt(b['seat'], 0, 7) ||
      !['open', 'locked', 'computer'].includes(b['mode'] as string) ||
      !isDifficulty(b['difficulty'])
    ) {
      return this.session(client) ? bad('invalidRequest') : bad('noSession');
    }
    const { seat, mode, difficulty } = b as {
      seat: number;
      mode: 'open' | 'locked' | 'computer';
      difficulty?: Difficulty;
    };
    return this.inRoom(client, (room, session) =>
      this.removed(room.setSeat(session.playerId, seat, mode, difficulty)),
    );
  }

  @SubscribeMessage('seat:ready')
  ready(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    if (!isObj(b) || typeof b['ready'] !== 'boolean')
      return this.session(client) ? bad('invalidRequest') : bad('noSession');
    const ready = b['ready'];
    return this.inRoom(client, (room, session) => room.setReady(session.playerId, ready));
  }

  @SubscribeMessage('game:start')
  startGame(@ConnectedSocket() client: Socket): Ack {
    return this.inRoom(client, (room, session) => room.start(session.playerId));
  }

  @SubscribeMessage('host:decide')
  decide(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    if (
      !isObj(b) ||
      !isInt(b['seat'], 0, 7) ||
      !['computer', 'free'].includes(b['decision'] as string) ||
      !isDifficulty(b['difficulty'])
    ) {
      return this.session(client) ? bad('invalidRequest') : bad('noSession');
    }
    const { seat, decision, difficulty } = b as {
      seat: number;
      decision: 'computer' | 'free';
      difficulty?: Difficulty;
    };
    return this.inRoom(client, (room, session) =>
      this.removed(room.decide(session.playerId, seat, decision, difficulty)),
    );
  }

  @SubscribeMessage('turn:action')
  act(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    if (!isObj(b) || !isAction(b['action']))
      return this.session(client) ? bad('invalidRequest') : bad('noSession');
    const action = b['action'];
    return this.inRoom(client, (room, session) => room.act(session.playerId, action));
  }

  // ---- helpers

  private session(client: Socket): Session | undefined {
    return this.sessions.bySocketId(client.id);
  }

  private roomOf(session: Session): GameRoom | undefined {
    const room = session.gameId ? this.registry.get(session.gameId) : undefined;
    if (!room) session.gameId = undefined;
    return room;
  }

  private inRoom(client: Socket, fn: (room: GameRoom, session: Session) => Res<object>): Ack {
    const session = this.session(client);
    if (!session) return bad('noSession');
    const room = this.roomOf(session);
    return room ? done(fn(room, session)) : bad('notInGame');
  }

  /** Detaches the humans a room action removed from the room (host replaced their seat). */
  private removed(res: Res<{ removed?: string }>): Res<object> {
    if (res.ok && res.removed) {
      const gone = this.sessions.byPlayerId(res.removed);
      if (gone) {
        this.exit(gone);
        this.emitTo(gone.socketId, 'game:closed', { reason: 'removed' });
      }
    }
    return res;
  }

  private enter(client: Socket, session: Session, room: GameRoom): void {
    session.gameId = room.id;
    void client.leave(LOBBY);
  }

  private exit(session: Session): void {
    session.gameId = undefined;
    if (session.socketId) {
      void this.server.sockets.sockets.get(session.socketId)?.join(LOBBY);
      this.emitTo(session.socketId, 'lobby:games', { games: this.registry.list() });
    }
  }

  private clientKey(client: Socket): string {
    const forwarded = client.handshake.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim();
    return first || client.handshake.address;
  }

  private emitTo<K extends keyof Pushes>(
    socketId: string | undefined,
    event: K,
    payload: Pushes[K],
  ): void {
    if (socketId) this.server.sockets.sockets.get(socketId)?.emit(event, payload);
  }

  private push(room: GameRoom, entries: LogEntry[]): void {
    for (const human of room.humans()) {
      const socketId = this.sessions.byPlayerId(human.playerId)?.socketId;
      this.emitTo(socketId, 'game:state', { game: toView(room, human.playerId) });
      if (entries.length) this.emitTo(socketId, 'game:log', { entries });
    }
    const summary = JSON.stringify(room.summary());
    if (this.summaries.get(room.id) !== summary) {
      this.summaries.set(room.id, summary);
      this.pushLobby();
    }
  }

  private pushLobby(): void {
    this.server.to(LOBBY).emit('lobby:games', { games: this.registry.list() });
  }

  private closed(room: GameRoom, reason: 'cleanup' | 'empty'): void {
    this.summaries.delete(room.id);
    this.limiter.forgetGame(room.id);
    for (const human of room.humans()) {
      const session = this.sessions.byPlayerId(human.playerId);
      if (!session) continue;
      this.exit(session);
      if (reason === 'cleanup') this.emitTo(session.socketId, 'game:closed', { reason });
    }
    this.pushLobby();
  }
}
