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
  isUiLanguage,
  rulesError,
  type Ack,
  type Action,
  type Difficulty,
  type Risk,
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
const RISKS = new Set(['none', 'medium', 'high', 'random']);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const isInt = (x: unknown, min: number, max: number): x is number =>
  Number.isInteger(x) && (x as number) >= min && (x as number) <= max;
const isPassword = (x: unknown): x is string =>
  typeof x === 'string' && x.length >= 4 && x.length <= 64;
/** An empty password means an open game. */
const isOptionalPassword = (x: unknown): x is string => x === '' || isPassword(x);
const isDifficulty = (x: unknown): x is Difficulty | undefined =>
  x === undefined || DIFFICULTIES.has(x as string);
const isRisk = (x: unknown): x is Risk | undefined => x === undefined || RISKS.has(x as string);
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
    const language = isUiLanguage(body['language']) ? body['language'] : undefined;
    let session = typeof token === 'string' ? this.sessions.byTokenValue(token) : undefined;
    if (!session) {
      const nickname = validNickname(body['nickname']);
      if (!nickname) return bad('invalidNickname');
      session = this.sessions.create(nickname, language);
    } else if (language) {
      session.language = language;
    }
    this.dropReplacedSocket(this.sessions.attach(session, client.id));
    let game;
    const room = session.gameId ? this.registry.get(session.gameId) : undefined;
    if (room && room.seatOf(session.playerId) >= 0) {
      void client.leave(LOBBY);
      room.setLanguage(session.playerId, session.language);
      room.setConnected(session.playerId, true);
      game = toView(room, session.playerId);
    } else {
      // removed by the host while offline: tell them now
      if (room?.banned.has(session.playerId))
        this.emitTo(client.id, 'game:closed', { reason: 'banned' });
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

  @SubscribeMessage('session:language')
  setLanguage(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    const session = this.session(client);
    if (!session) return bad('noSession');
    if (!isObj(b) || !isUiLanguage(b['language'])) return bad('invalidRequest');
    session.language = b['language'];
    this.roomOf(session)?.setLanguage(session.playerId, session.language);
    return { ok: true };
  }

  @SubscribeMessage('lobby:list')
  list(@ConnectedSocket() client: Socket): Ack<Intents['lobby:list'][1]> {
    const session = this.session(client);
    return session ? { ok: true, games: this.registry.list(session.playerId) } : bad('noSession');
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
    if (!isOptionalPassword(b['password'])) return bad('invalidPassword');
    if (rulesError(b['rules']) !== null) return bad('invalidRequest');
    const room = this.registry.create({
      name,
      passwordHash: b['password'] === '' ? '' : hashPassword(b['password']),
      rules: b['rules'] as unknown as Rules,
      seatCount: b['seats'],
      host: {
        playerId: session.playerId,
        nickname: session.nickname,
        language: session.language,
      },
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
    const room = this.registry.get(b['gameId']);
    if (!room) return bad('gameNotFound');
    if (room.passwordHash !== '') {
      if (!isPassword(b['password'])) return bad('invalidPassword');
      const key = this.clientKey(client);
      const wait = this.limiter.retryAfterMs(key, room.id);
      if (wait > 0) return { ok: false, reason: 'locked', retryAfterMs: wait };
      if (!verifyPassword(b['password'], room.passwordHash)) {
        return {
          ok: false,
          reason: 'wrongPassword',
          attemptsLeft: this.limiter.fail(key, room.id),
        };
      }
      this.limiter.succeed(key, room.id);
    }
    const joined = room.join(
      session.playerId,
      session.nickname,
      b['seat'] as number | undefined,
      session.language,
    );
    if (!joined.ok) return done(joined) as Ack<never>;
    this.enter(client, session, room);
    this.pushLobby();
    return { ok: true, game: toView(room, session.playerId) };
  }

  @SubscribeMessage('game:rejoin')
  rejoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() b: unknown,
  ): Ack<Intents['game:rejoin'][1]> {
    const session = this.session(client);
    if (!session) return bad('noSession');
    if (this.roomOf(session)) return bad('alreadyInGame');
    if (!isObj(b) || typeof b['gameId'] !== 'string') return bad('invalidRequest');
    const room = this.registry.get(b['gameId']);
    if (!room) return bad('gameNotFound');
    const res = room.rejoin(session.playerId, session.language);
    if (!res.ok) return res;
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
      !isDifficulty(b['difficulty']) ||
      !isRisk(b['risk'])
    ) {
      return this.session(client) ? bad('invalidRequest') : bad('noSession');
    }
    const { seat, mode, difficulty, risk } = b as {
      seat: number;
      mode: 'open' | 'locked' | 'computer';
      difficulty?: Difficulty;
      risk?: Risk;
    };
    return this.inRoom(client, (room, session) =>
      this.removed(room.setSeat(session.playerId, seat, mode, difficulty, risk)),
    );
  }

  @SubscribeMessage('seat:rename')
  renameSeat(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    if (
      !isObj(b) ||
      !isInt(b['seat'], 0, 7) ||
      (b['name'] !== undefined && typeof b['name'] !== 'string')
    )
      return this.session(client) ? bad('invalidRequest') : bad('noSession');
    const { seat, name } = b as { seat: number; name?: string };
    return this.inRoom(client, (room, session) =>
      room.renameComputer(session.playerId, seat, name),
    );
  }

  @SubscribeMessage('seat:remove')
  removeSeat(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    if (!isObj(b) || !isInt(b['seat'], 0, 7))
      return this.session(client) ? bad('invalidRequest') : bad('noSession');
    const seat = b['seat'];
    return this.inRoom(client, (room, session) =>
      this.removed(room.removeSeat(session.playerId, seat)),
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

  @SubscribeMessage('turn:action')
  act(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    if (!isObj(b) || !isAction(b['action']))
      return this.session(client) ? bad('invalidRequest') : bad('noSession');
    const action = b['action'];
    return this.inRoom(client, (room, session) => room.act(session.playerId, action));
  }

  @SubscribeMessage('turn:preview')
  preview(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    const dice = isObj(b) ? b['dice'] : undefined;
    if (!Array.isArray(dice) || !dice.every((d) => Number.isInteger(d)))
      return this.session(client) ? bad('invalidRequest') : bad('noSession');
    return this.inRoom(client, (room, session) => room.setPreview(session.playerId, dice));
  }

  @SubscribeMessage('game:settings')
  settings(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    const fast = isObj(b) ? b['fastComputerDice'] : undefined;
    const speed = isObj(b) ? b['computerSpeed'] : undefined;
    const showOdds = isObj(b) ? b['showBustProbability'] : undefined;
    const valid =
      (fast === undefined || typeof fast === 'boolean') &&
      (speed === undefined || isInt(speed, 1, 5)) &&
      (showOdds === undefined || typeof showOdds === 'boolean') &&
      (fast !== undefined || speed !== undefined || showOdds !== undefined);
    if (!valid) return this.session(client) ? bad('invalidRequest') : bad('noSession');
    return this.inRoom(client, (room, session) => {
      const res = room.setSettings(session.playerId, {
        ...(fast !== undefined && { fastComputerDice: fast as boolean }),
        ...(speed !== undefined && { computerSpeed: speed as number }),
        ...(typeof showOdds === 'boolean' && { showBustProbability: showOdds }),
      });
      if (res.ok && res.changes.length > 0) {
        for (const h of room.humans())
          this.emitTo(this.sessions.byPlayerId(h.playerId)?.socketId, 'game:settingsChanged', {
            by: session.nickname,
            changes: res.changes,
          });
      }
      return res.ok ? { ok: true } : res; // `changes` is for the push only
    });
  }

  @SubscribeMessage('game:pause')
  pause(@ConnectedSocket() client: Socket, @MessageBody() b: unknown): Ack {
    const paused = isObj(b) ? b['paused'] : undefined;
    if (typeof paused !== 'boolean')
      return this.session(client) ? bad('invalidRequest') : bad('noSession');
    return this.inRoom(client, (room, session) => room.setPaused(session.playerId, paused));
  }

  // ---- helpers

  private dropReplacedSocket(replaced: string | undefined): void {
    if (!replaced) return;
    this.emitTo(replaced, 'session:replaced', undefined);
    this.server.sockets.sockets.get(replaced)?.disconnect(true);
  }

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
      // an offline player keeps the game id so the ban is reported on return
      if (gone?.socketId) {
        this.exit(gone);
        this.emitTo(gone.socketId, 'game:closed', { reason: 'banned' });
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
      this.emitTo(session.socketId, 'lobby:games', {
        games: this.registry.list(session.playerId),
      });
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
    // also players a computer took over from after timeouts: they get the notice to leave
    const watchers = new Set(room.humans().map((h) => h.playerId));
    for (const s of room.seats)
      if (s.state === 'computer' && s.former) {
        const id = s.former.playerId;
        if (this.sessions.byPlayerId(id)?.gameId === room.id) watchers.add(id);
      }
    for (const playerId of watchers) {
      const socketId = this.sessions.byPlayerId(playerId)?.socketId;
      this.emitTo(socketId, 'game:state', { game: toView(room, playerId) });
      if (entries.length) this.emitTo(socketId, 'game:log', { entries });
    }
    const summary = JSON.stringify(room.summary());
    if (this.summaries.get(room.id) !== summary) {
      this.summaries.set(room.id, summary);
      this.pushLobby();
    }
  }

  private pushLobby(): void {
    // rejoinable differs per player, so every lobby socket gets its own list
    for (const id of this.server.sockets.adapter.rooms.get(LOBBY) ?? []) {
      const playerId = this.sessions.bySocketId(id)?.playerId;
      this.emitTo(id, 'lobby:games', { games: this.registry.list(playerId) });
    }
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
