import { randomInt } from 'node:crypto';
import {
  applyAction,
  chooseAction,
  createGame,
  type Action,
  type ComputerLevel,
  type Difficulty,
  type ErrorReason,
  type GameState,
  type GameSummary,
  type LogEntry,
  type LogKind,
  type RandomInt,
  type RejectionReason,
  type RoomPhase,
  type Rules,
} from 'game-rules';

export const SEATS = 8;
export const GRACE_MS = 30_000;
/** Server-side limit per human action; expiry plays the automatic action (FR-018). */
export const TURN_LIMIT_MS = {
  draw: 10_000,
  throw: 10_000,
  select: 15_000,
  decide: 15_000,
} as const;
/** The 3rd timeout in a row hands the seat to a computer. */
export const MAX_TIMEOUTS = 3;
export const LOG_CAP = 500;
/** Computer pacing: after a throw wait out the client roll (max) plus 3 s; otherwise 2 s (FR-013, FR-019). */
const ROLL_MAX_MS = 3000;
const ROLL_MAX_FAST_MS = 1500;
const AFTER_ROLL_MS = 3000 + 250; // ponytail: fixed latency margin, the server cannot observe client animations
const COMPUTER_PAUSE_MS = 2000;

type Level = 'easy' | 'medium' | 'hard';

export type Seat =
  | { state: 'open' }
  | { state: 'locked' }
  | {
      state: 'human';
      playerId: string;
      nickname: string;
      connected: boolean;
      ready: boolean;
      disconnectedAt?: number;
      timeouts: number;
    }
  | {
      state: 'computer';
      difficulty: Difficulty;
      effective: Level;
      /** Set only when the computer replaced a human, who may rejoin. */
      former?: { playerId: string; nickname: string };
    };

type Human = Extract<Seat, { state: 'human' }>;
export type ReplaceReason = 'left' | 'disconnected' | 'timeouts';

export type Fail = { ok: false; reason: ErrorReason; engine?: RejectionReason };
export type Res<T = object> = ({ ok: true } & T) | Fail;

const fail = (reason: ErrorReason): Fail => ({ ok: false, reason });

export interface RoomOptions {
  id: string;
  name: string;
  passwordHash: string;
  rules: Rules;
  seatCount: number;
  host: { playerId: string; nickname: string };
  now?: () => number;
  rng?: RandomInt;
  graceMs?: number;
  /** Called after every accepted change, also from timers, with the log entries added since the last call. */
  onChange?: (entries: LogEntry[]) => void;
}

const levelFor = (d: Difficulty): ComputerLevel =>
  d === 'random' ? (['easy', 'medium', 'hard'] as const)[randomInt(3)] : d;

export class GameRoom {
  readonly id: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly rules: Rules;
  readonly createdAt: number;
  readonly graceMs: number;
  readonly seats: Seat[] = [];
  hostId: string;
  phase: RoomPhase = 'lobby';
  game: GameState | null = null;
  log: LogEntry[] = [];
  /** Players removed by the host; they may not join or rejoin. */
  readonly banned = new Set<string>();
  onChange?: (entries: LogEntry[]) => void;

  private readonly now: () => number;
  private readonly rng: RandomInt;
  /** Dice indices the active player has ticked but not yet confirmed; shown to the others. */
  preview: number[] = [];
  /** Host setting: computer throws roll for 1–2.5 s instead of 2–5 s on every client. */
  fastComputerDice = false;
  private computerDelay = COMPUTER_PAUSE_MS;
  private fresh: LogEntry[] = [];
  private seatOfEngine: number[] = [];
  private readonly graceTimers = new Map<number, NodeJS.Timeout>();
  private computerTimer?: NodeJS.Timeout;

  constructor(o: RoomOptions) {
    this.id = o.id;
    this.name = o.name;
    this.passwordHash = o.passwordHash;
    this.rules = o.rules;
    this.hostId = o.host.playerId;
    this.now = o.now ?? Date.now;
    this.rng = o.rng ?? ((n) => randomInt(n));
    this.graceMs = o.graceMs ?? GRACE_MS;
    this.onChange = o.onChange;
    this.createdAt = this.now();
    for (let i = 0; i < SEATS; i++) this.seats.push({ state: i < o.seatCount ? 'open' : 'locked' });
    this.seats[0] = this.humanSeat(o.host.playerId, o.host.nickname);
  }

  // ---- queries

  seatOf(playerId: string): number {
    return this.seats.findIndex((s) => s.state === 'human' && s.playerId === playerId);
  }

  humans() {
    return this.seats.flatMap((s) => (s.state === 'human' ? [s] : []));
  }

  hasConnectedHuman(): boolean {
    return this.humans().some((h) => h.connected);
  }

  host() {
    return this.humans().find((h) => h.playerId === this.hostId);
  }

  summary(): GameSummary {
    return {
      id: this.id,
      name: this.name,
      host: this.host()?.nickname ?? '',
      targetScore: this.rules.targetScore,
      seatsUsed: this.seats.filter((s) => s.state === 'human' || s.state === 'computer').length,
      seatsTotal: this.seats.filter((s) => s.state !== 'locked').length,
      protected: this.passwordHash !== '',
      rejoinable: false,
      phase: this.phase,
    };
  }

  // ---- lobby

  join(playerId: string, nickname: string, seat?: number): Res<{ seat: number }> {
    if (this.phase !== 'lobby') return fail('gameStarted');
    const lower = nickname.toLowerCase();
    if (this.humans().some((h) => h.nickname.toLowerCase() === lower)) return fail('nicknameTaken');
    let index = seat;
    if (index === undefined) {
      index = this.seats.findIndex((s) => s.state === 'open');
      if (index < 0) return fail('gameFull');
    } else if (this.seats[index]?.state !== 'open') {
      return fail('seatNotFree');
    }
    this.seats[index] = this.humanSeat(playerId, nickname);
    this.resetReady();
    this.add('joined', index);
    this.emit();
    return { ok: true, seat: index };
  }

  /** Deliberate leave. Returns whether the room has no human left. */
  leave(playerId: string): Res<{ empty: boolean }> {
    const seat = this.seatOf(playerId);
    if (seat < 0) return fail('notInGame');
    this.clearGrace(seat);
    if (this.phase === 'running') {
      this.replaceByBot(seat, 'left');
    } else {
      this.add('left', seat);
      this.seats[seat] = { state: 'open' };
      this.resetReady();
    }
    if (this.hostId === playerId) this.electHost(playerId);
    this.emit();
    return { ok: true, empty: this.humans().length === 0 };
  }

  setSeat(
    playerId: string,
    seat: number,
    mode: 'open' | 'locked' | 'computer',
    difficulty: Difficulty = 'medium',
  ): Res<{ removed?: string }> {
    if (playerId !== this.hostId) return fail('notHost');
    if (this.phase !== 'lobby') return fail('gameStarted');
    const current = this.seats[seat];
    if (!current) return fail('invalidRequest');
    let removed: string | undefined;
    if (mode === 'computer') {
      if (current.state === 'human') {
        if (current.playerId === this.hostId) return fail('seatOccupied');
        removed = current.playerId;
      }
      this.seats[seat] = {
        state: 'computer',
        difficulty,
        effective: levelFor(difficulty),
      };
    } else if (current.state === 'human' || current.state === 'computer') {
      // occupied seats are freed by removing the occupant first: computers via 'open'
      if (mode === 'locked' || current.state === 'human') return fail('seatOccupied');
      this.seats[seat] = { state: 'open' };
    } else {
      this.seats[seat] = { state: mode };
    }
    this.resetReady();
    this.add('seatChanged', seat, mode === 'computer' ? difficulty : mode);
    this.emit();
    return { ok: true, removed };
  }

  setReady(playerId: string, ready: boolean): Res {
    const seat = this.seatOf(playerId);
    if (seat < 0) return fail('notInGame');
    if (this.phase !== 'lobby') return fail('gameStarted');
    (this.seats[seat] as Extract<Seat, { state: 'human' }>).ready = ready;
    this.emit();
    return { ok: true };
  }

  start(playerId: string): Res {
    if (playerId !== this.hostId) return fail('notHost');
    if (this.phase !== 'lobby') return fail('gameStarted');
    const occupied = this.seats.flatMap((s, i) =>
      s.state === 'human' || s.state === 'computer' ? [i] : [],
    );
    if (occupied.length < 2) return fail('notEnoughPlayers');
    if (this.humans().some((h) => !h.ready)) return fail('notReady');
    this.seatOfEngine = occupied;
    this.game = createGame(
      occupied.map((i) => {
        const s = this.seats[i];
        return s.state === 'human' ? s.nickname : `Computer ${i + 1}`;
      }),
      this.rules,
      this.rng,
    );
    this.phase = 'running';
    this.add('started');
    this.emit();
    return { ok: true };
  }

  // ---- play

  act(playerId: string, action: Action): Res {
    if (this.phase !== 'running' || !this.game) return fail('notInGame');
    const seat = this.seatOf(playerId);
    if (seat < 0) return fail('notInGame');
    if (seat !== this.currentSeat()) return fail('notYourTurn');
    return this.apply(action);
  }

  setPreview(playerId: string, dice: number[]): Res {
    if (this.phase !== 'running' || !this.game) return fail('notInGame');
    const seat = this.seatOf(playerId);
    if (seat < 0) return fail('notInGame');
    if (seat !== this.currentSeat()) return fail('notYourTurn');
    const n = this.game.turn?.dice.length ?? 0;
    if (new Set(dice).size !== dice.length || dice.some((d) => d < 0 || d >= n))
      return fail('invalidRequest');
    this.preview = dice;
    this.emit();
    return { ok: true };
  }

  /** Host only, running game; changes how long clients show computer dice rolling. */
  setSettings(playerId: string, fastComputerDice: boolean): Res {
    if (playerId !== this.hostId) return fail('notHost');
    if (this.phase === 'finished') return fail('notInGame');
    this.fastComputerDice = fastComputerDice;
    this.emit();
    return { ok: true };
  }

  private apply(action: Action): Res {
    const game = this.game as GameState;
    const seat = this.currentSeat();
    const outcome = applyAction(game, action, this.rng);
    if (!outcome.ok) return { ok: false, reason: 'rejected', engine: outcome.reason };
    this.game = outcome.state;
    this.preview = [];
    const rollMax =
      this.seats[seat]?.state === 'computer' && this.fastComputerDice
        ? ROLL_MAX_FAST_MS
        : ROLL_MAX_MS;
    this.computerDelay = outcome.events.some((e) => e.type === 'thrown')
      ? rollMax + AFTER_ROLL_MS
      : COMPUTER_PAUSE_MS;
    for (const event of outcome.events) this.add('turn', seat, event);
    if (outcome.state.result) {
      this.phase = 'finished';
      this.add('finished');
      this.clearTimers();
    }
    this.emit();
    return { ok: true };
  }

  private currentSeat(): number {
    return this.seatOfEngine[this.game?.current ?? 0] ?? -1;
  }

  private scheduleComputer() {
    if (this.computerTimer || this.phase !== 'running' || !this.game) return;
    if (this.seats[this.currentSeat()]?.state !== 'computer') return;
    const stillMine = () => {
      this.computerTimer = undefined;
      const seat = this.seats[this.currentSeat()];
      return this.phase === 'running' && this.game && seat?.state === 'computer' ? seat : undefined;
    };
    this.computerTimer = setTimeout(() => {
      const seat = stillMine();
      if (!seat || !this.game) return;
      const action = chooseAction(this.game, seat.effective, this.rng);
      if (action.type !== 'select') {
        this.apply(action);
        return;
      }
      // show the pick as a highlight for 2 s before it is applied; the timer is set first so emit() does not reschedule
      this.preview = [...action.dice];
      this.computerTimer = setTimeout(() => {
        if (stillMine()) this.apply(action);
      }, COMPUTER_PAUSE_MS);
      this.emit();
    }, this.computerDelay);
  }

  // ---- connection, replacement

  setConnected(playerId: string, connected: boolean): void {
    const seat = this.seatOf(playerId);
    if (seat < 0) return;
    const human = this.seats[seat] as Extract<Seat, { state: 'human' }>;
    if (human.connected === connected) return;
    human.connected = connected;
    if (connected) {
      this.clearGrace(seat);
      human.disconnectedAt = undefined;
      this.add('reconnected', seat);
    } else {
      human.disconnectedAt = this.now();
      this.add('disconnected', seat);
      this.graceTimers.set(
        seat,
        setTimeout(() => this.graceOver(seat, playerId), this.graceMs),
      );
    }
    this.emit();
  }

  private graceOver(seat: number, playerId: string) {
    this.graceTimers.delete(seat);
    if (this.seatOf(playerId) !== seat) return;
    if (this.phase === 'running') this.replaceByBot(seat, 'disconnected');
    else this.seats[seat] = { state: 'open' };
    if (this.hostId === playerId) this.electHost(playerId);
    this.emit();
  }

  /** Hands a human seat to a computer of random difficulty; the engine player and score stay. */
  private replaceByBot(seat: number, reason: ReplaceReason) {
    const human = this.seats[seat] as Human;
    this.clearGrace(seat);
    this.seats[seat] = {
      state: 'computer',
      difficulty: 'random',
      effective: levelFor('random'),
      former: { playerId: human.playerId, nickname: human.nickname },
    };
    if (seat === this.currentSeat()) this.preview = [];
    this.add('replaced', seat, reason);
  }

  private electHost(leaving: string) {
    const others = this.humans().filter((h) => h.playerId !== leaving);
    const next = others.find((h) => h.connected) ?? others[0];
    if (!next) return;
    this.hostId = next.playerId;
    this.add('hostChanged', this.seatOf(next.playerId));
  }

  // ---- internals

  /** Clears timers; the room is not used afterwards. */
  dispose(): void {
    this.clearTimers();
    this.onChange = undefined;
  }

  private clearTimers() {
    for (const t of this.graceTimers.values()) clearTimeout(t);
    this.graceTimers.clear();
    clearTimeout(this.computerTimer);
    this.computerTimer = undefined;
  }

  private clearGrace(seat: number) {
    clearTimeout(this.graceTimers.get(seat));
    this.graceTimers.delete(seat);
  }

  private humanSeat(playerId: string, nickname: string): Seat {
    return { state: 'human', playerId, nickname, connected: true, ready: false, timeouts: 0 };
  }

  private resetReady() {
    for (const h of this.humans()) h.ready = false;
  }

  private add(kind: LogKind, seat?: number, data?: LogEntry['data']) {
    const entry: LogEntry = { at: this.now(), kind };
    if (seat !== undefined) entry.seat = seat;
    if (data !== undefined) entry.data = data;
    this.log.push(entry);
    if (this.log.length > LOG_CAP) this.log.shift();
    this.fresh.push(entry);
  }

  private emit() {
    this.scheduleComputer();
    const entries = this.fresh;
    this.fresh = [];
    this.onChange?.(entries);
  }
}
