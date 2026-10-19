import { randomInt } from 'node:crypto';
import { uniqueName } from 'computer-names';
import {
  applyAction,
  chooseAction,
  createGame,
  DEFAULT_SPEED,
  isComputerSpeed,
  pacing,
  renamePlayer,
  skipTurn,
  type Action,
  type Difficulty,
  type Risk,
  type ErrorReason,
  type GameState,
  type GameSettings,
  type GameSummary,
  type LogEntry,
  type LogKind,
  type Pacing,
  type Phase,
  type RandomInt,
  type RejectionReason,
  type RoomPhase,
  type SettingChange,
  type Rules,
  type UiLanguage,
} from 'game-rules';
import { validNickname } from './sessions.service';

export const SEATS = 8;
export const GRACE_MS = 30_000;
/** Server-side limit per human action; expiry plays the automatic action (FR-018). */
export const TURN_LIMIT_MS = {
  draw: 10_000,
  throw: 10_000,
  select: 15_000,
  decide: 20_000,
} as const;
/** The 3rd timeout in a row hands the seat to a computer. */
export const MAX_TIMEOUTS = 3;
export const LOG_CAP = 500;
/**
 * Computer pacing comes from `pacing(computerSpeed)`: after a throw wait out the client roll (max) plus a margin,
 * otherwise a pause (FR-013, FR-019). The roll maximum is the client animation and does not scale.
 */
const ROLL_MAX_MS = 3000;
const ROLL_MAX_FAST_MS = 1500;
/** Human limit after a throw: fixed latency margin, the server cannot observe client animations (FR-013). */
const HUMAN_AFTER_ROLL_MS = 3000 + 250;

export type Seat =
  | { state: 'open' }
  | { state: 'locked' }
  | {
      state: 'human';
      playerId: string;
      nickname: string;
      /** Latest UI language of the player; kept when they leave so a takeover can be named in it. */
      language: UiLanguage;
      connected: boolean;
      ready: boolean;
      disconnectedAt?: number;
      timeouts: number;
    }
  | {
      state: 'computer';
      /** Display name, generated or entered by the host; unique among all occupied seats. */
      name: string;
      difficulty: Difficulty;
      risk: Risk;
      /** Set only when the computer replaced a human, who may rejoin. */
      former?: { playerId: string; nickname: string };
    }
  | {
      /** A rematch holds this seat for a player who is still in the game-over modal; not human, not ready. */
      state: 'reserved';
      playerId: string;
      nickname: string;
      language: UiLanguage;
    };

type Human = Extract<Seat, { state: 'human' }>;
type ComputerSeat = Extract<Seat, { state: 'computer' }>;
type Reserved = Extract<Seat, { state: 'reserved' }>;

/** The finished game as it was, kept for players who wait for the rematch and still look at its table. */
export interface Archive {
  round: number;
  game: GameState;
  seats: Seat[];
  log: LogEntry[];
  logBase: number;
  hostId: string;
}
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
  host: { playerId: string; nickname: string; language?: UiLanguage };
  now?: () => number;
  rng?: RandomInt;
  /** Picks computer names; separate from `rng` so naming never consumes dice or deck randomness. */
  nameRng?: RandomInt;
  graceMs?: number;
  /** Called after every accepted change, also from timers, with the log entries added since the last call. */
  onChange?: (entries: LogEntry[]) => void;
}

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
  /** Number of entries dropped from the front of `log` (it is capped). */
  logBase = 0;
  /** Players removed by the host; they may not join or rejoin. */
  readonly banned = new Set<string>();
  /** Game number in this room; each rematch adds one. */
  round = 1;
  /** Set by a rematch: the finished game that waiting players still see. */
  archive?: Archive;
  /** Players whose reserved seat the start of the next game dropped; they still see `archive`. */
  readonly dropped = new Set<string>();
  /** Host setting: visitors may watch while the game runs. */
  spectating = true;
  /** Player ids of connected spectators; never seated, never counted as humans (they cannot disturb timers). */
  readonly spectators = new Set<string>();
  onChange?: (entries: LogEntry[]) => void;

  private readonly now: () => number;
  private readonly rng: RandomInt;
  private readonly nameRng: RandomInt;
  /** Dice indices the active player has ticked but not yet confirmed; shown to the others. */
  preview: number[] = [];
  /** Host setting: computer throws roll for 1–2.5 s instead of 2–5 s on every client. */
  fastComputerDice = false;
  /** Host setting: computer speed 1 (slow) to 5 (fast), see `pacing`. */
  computerSpeed = DEFAULT_SPEED;
  showBustProbability = false;
  /** Host pause of a running game; timers are stopped and their remaining time kept in `frozen`. */
  paused = false;
  private frozen?: { computerElapsed?: number; turnLeft?: number };
  private computerDelay: (p: Pacing) => number = (p) => p.pauseMs;
  /** The armed computer timer, kept so a speed change can re-arm it. */
  private pending?: { delayFor: (p: Pacing) => number; run: () => void; startedAt: number };
  private fresh: LogEntry[] = [];
  private seatOfEngine: number[] = [];
  private readonly graceTimers = new Map<number, NodeJS.Timeout>();
  private computerTimer?: NodeJS.Timeout;
  private turnTimer?: NodeJS.Timeout;
  /** Extra wait before a human's limit starts: the client's dice are still rolling. */
  private turnDelay = 0;
  /** When the human to act is auto-played; only set while a human is up. */
  turnDeadline?: { at: number; phase: Phase };

  constructor(o: RoomOptions) {
    this.id = o.id;
    this.name = o.name;
    this.passwordHash = o.passwordHash;
    this.rules = o.rules;
    this.hostId = o.host.playerId;
    this.now = o.now ?? Date.now;
    this.rng = o.rng ?? ((n) => randomInt(n));
    this.nameRng = o.nameRng ?? ((n) => randomInt(n));
    this.graceMs = o.graceMs ?? GRACE_MS;
    this.onChange = o.onChange;
    this.createdAt = this.now();
    for (let i = 0; i < SEATS; i++) this.seats.push({ state: i < o.seatCount ? 'open' : 'locked' });
    this.seats[0] = this.humanSeat(o.host.playerId, o.host.nickname, o.host.language);
  }

  // ---- queries

  seatOf(playerId: string): number {
    return this.seats.findIndex((s) => s.state === 'human' && s.playerId === playerId);
  }

  humans() {
    return this.seats.flatMap((s) => (s.state === 'human' ? [s] : []));
  }

  /** Index of the seat reserved for the player, or -1. */
  reservedSeat(playerId: string): number {
    return this.seats.findIndex((s) => s.state === 'reserved' && s.playerId === playerId);
  }

  /** Players who wait for the rematch (reserved) or were dropped by its start; they see `archive`. */
  watchers(): string[] {
    const reserved = this.seats.flatMap((s) => (s.state === 'reserved' ? [s.playerId] : []));
    return [...reserved, ...this.dropped];
  }

  hasConnectedHuman(): boolean {
    return this.humans().some((h) => h.connected);
  }

  host() {
    return this.humans().find((h) => h.playerId === this.hostId);
  }

  /** `forPlayer` marks the game rejoinable when a computer holds their former seat. */
  summary(forPlayer?: string): GameSummary {
    return {
      id: this.id,
      name: this.name,
      host: this.host()?.nickname ?? '',
      targetScore: this.rules.targetScore,
      seatsUsed: this.seats.filter(
        (s) => s.state === 'human' || s.state === 'computer' || s.state === 'reserved',
      ).length,
      seatsTotal: this.seats.filter((s) => s.state !== 'locked').length,
      protected: this.passwordHash !== '',
      rejoinable: this.formerSeat(forPlayer) >= 0,
      banned: !!forPlayer && this.banned.has(forPlayer),
      closable: this.canEnd(forPlayer),
      phase: this.phase,
      spectatable: this.phase === 'running' && this.spectating,
    };
  }

  /**
   * A visitor starts watching. `resume` lets a returning spectator back into a finished game
   * (until they leave); a new one needs a running game. Join and leave write no log entry.
   */
  addSpectator(playerId: string, resume = false): Res {
    const open = this.phase === 'running' || (resume && this.phase === 'finished');
    if (!open || !this.spectating) return fail('notSpectatable');
    if (
      this.seatOf(playerId) >= 0 ||
      this.reservedSeat(playerId) >= 0 ||
      this.dropped.has(playerId)
    ) {
      return fail('alreadyInGame');
    }
    if (!this.spectators.has(playerId)) {
      this.spectators.add(playerId);
      this.onChange?.([]);
    }
    return { ok: true };
  }

  removeSpectator(playerId: string): boolean {
    if (!this.spectators.delete(playerId)) return false;
    this.onChange?.([]);
    return true;
  }

  /** Removes all spectators without a push and returns them; the caller tells them. */
  private evictSpectators(): string[] {
    const ids = [...this.spectators];
    this.spectators.clear();
    return ids;
  }

  /** Only the last host may end a running game, and only while no human is seated any more. */
  canEnd(playerId?: string): boolean {
    return (
      !!playerId &&
      this.phase === 'running' &&
      playerId === this.hostId &&
      this.humans().length === 0
    );
  }

  private formerSeat(playerId?: string): number {
    if (this.phase !== 'running' || !playerId) return -1;
    return this.seats.findIndex((s) => s.state === 'computer' && s.former?.playerId === playerId);
  }

  // ---- lobby

  join(
    playerId: string,
    nickname: string,
    seat?: number,
    language?: UiLanguage,
  ): Res<{ seat: number }> {
    if (this.banned.has(playerId)) return fail('banned');
    if (this.phase !== 'lobby') return fail('gameStarted');
    if (this.takenNames().has(nickname.toLowerCase())) return fail('nicknameTaken');
    let index = seat;
    if (index === undefined) {
      index = this.seats.findIndex((s) => s.state === 'open');
      if (index < 0) return fail('gameFull');
    } else if (this.seats[index]?.state !== 'open') {
      return fail('seatNotFree');
    }
    this.seats[index] = this.humanSeat(playerId, nickname, language);
    this.resetReady();
    this.add('joined', index);
    this.emit();
    return { ok: true, seat: index };
  }

  /** A player who left or timed out takes their seat back from the computer. */
  rejoin(playerId: string, language?: UiLanguage): Res<{ seat: number }> {
    if (this.banned.has(playerId)) return fail('banned');
    if (this.seatOf(playerId) >= 0) return fail('alreadyInGame');
    const seat = this.formerSeat(playerId);
    if (seat < 0) return fail('notRejoinable');
    const { former } = this.seats[seat] as ComputerSeat;
    const { nickname } = former as NonNullable<ComputerSeat['former']>;
    this.seats[seat] = this.humanSeat(playerId, nickname, language);
    this.nameEnginePlayer(seat, nickname);
    clearTimeout(this.computerTimer);
    this.computerTimer = undefined;
    this.preview = [];
    this.add('rejoined', seat);
    // nobody hosts while only computers were left: the first one back takes over
    if (!this.host()) this.setHost(playerId);
    this.emit();
    return { ok: true, seat };
  }

  /**
   * Host of a finished game: the same room becomes a lobby again. The host keeps their seat; the other
   * humans get a reserved seat; computers the host set up stay; seats of players who left, and of
   * humans a computer replaced, are freed. `round` is the finished game's round.
   */
  rematch(playerId: string, round: number): Res<{ evicted: string[] }> {
    if (playerId !== this.hostId) return fail('notHost');
    if (round !== this.round) return fail('staleRound');
    if (this.phase !== 'finished' || !this.game) return fail('gameStarted');
    this.archive = {
      round: this.round,
      game: this.game,
      seats: structuredClone(this.seats),
      log: this.log,
      logBase: this.logBase,
      hostId: this.hostId,
    };
    this.dropped.clear();
    this.seats.forEach((seat, i) => {
      if (seat.state === 'human' && seat.playerId === this.hostId) {
        this.seats[i] = this.humanSeat(seat.playerId, seat.nickname, seat.language);
      } else if (seat.state === 'human') {
        this.seats[i] = {
          state: 'reserved',
          playerId: seat.playerId,
          nickname: seat.nickname,
          language: seat.language,
        };
      } else if (seat.state === 'computer' && seat.former) {
        this.seats[i] = { state: 'open' };
      }
    });
    this.clearTimers();
    this.phase = 'lobby';
    this.game = null;
    this.seatOfEngine = [];
    this.preview = [];
    this.paused = false;
    this.frozen = undefined;
    this.pending = undefined;
    this.computerDelay = (p) => p.pauseMs;
    this.turnDelay = 0;
    this.logBase += this.log.length;
    this.log = [];
    this.fresh = [];
    this.round++;
    this.add('rematch', this.seatOf(this.hostId));
    const evicted = this.evictSpectators();
    this.emit();
    return { ok: true, evicted };
  }

  /** A player waiting in the game-over modal takes their reserved seat; `round` is the finished game's round. */
  rematchJoin(playerId: string, round: number, language?: UiLanguage): Res<{ seat: number }> {
    if (this.banned.has(playerId)) return fail('banned');
    if (round !== this.round - 1) return fail('staleRound');
    const seat = this.reservedSeat(playerId);
    if (this.phase !== 'lobby' || seat < 0) return fail('notRejoinable');
    const reserved = this.seats[seat] as Reserved;
    this.seats[seat] = this.humanSeat(playerId, reserved.nickname, language ?? reserved.language);
    this.resetReady();
    this.add('rejoined', seat);
    this.emit();
    return { ok: true, seat };
  }

  /** Remembers the UI language of a seated player; computers are named in the host's. */
  setLanguage(playerId: string, language: UiLanguage): void {
    const seat = this.seats[this.seatOf(playerId)];
    if (seat?.state === 'human') seat.language = language;
  }

  /** Host only: renames a computer in the lobby or a running game; without a name it gets a newly generated one. */
  renameComputer(playerId: string, seat: number, name?: unknown): Res {
    if (playerId !== this.hostId) return fail('notHost');
    if (this.phase === 'finished') return fail('notInGame');
    const current = this.seats[seat];
    if (current?.state !== 'computer') return fail('invalidRequest');
    const others = this.takenNames();
    others.delete(current.name.toLowerCase());
    const valid =
      name === undefined
        ? uniqueName(
            this.hostLanguage(),
            new Set([...others, current.name.toLowerCase()]),
            this.nameRng,
          )
        : validNickname(name);
    if (!valid) return fail('invalidNickname');
    if (others.has(valid.toLowerCase())) return fail('nicknameTaken');
    if (valid === current.name) return { ok: true };
    const old = current.name;
    current.name = valid;
    this.nameEnginePlayer(seat, valid);
    this.add('renamed', seat, old);
    this.emit();
    return { ok: true };
  }

  /** Deliberate leave. Returns whether the room has no human left. */
  leave(playerId: string): Res<{ empty: boolean }> {
    const reserved = this.reservedSeat(playerId);
    if (reserved >= 0) {
      this.seats[reserved] = { state: 'open' };
      this.resetReady();
      this.add('left', reserved);
      this.emit();
      return { ok: true, empty: this.humans().length === 0 };
    }
    // dropped by the start of the next game: nothing to free, the player only dismisses the modal
    if (this.dropped.delete(playerId)) return { ok: true, empty: this.humans().length === 0 };
    const seat = this.seatOf(playerId);
    // seatless: a computer already took over after timeouts; the player only dismisses the notice
    if (seat < 0) return { ok: true, empty: this.humans().length === 0 };
    this.clearGrace(seat);
    if (this.phase === 'running') {
      this.replaceByBot(seat, 'left');
    } else if (this.phase === 'finished') {
      this.depart(seat);
    } else {
      this.add('left', seat);
      this.seats[seat] = { state: 'open' };
      this.resetReady();
    }
    if (this.hostId === playerId) this.electHost(playerId);
    this.emit();
    return { ok: true, empty: this.humans().length === 0 };
  }

  /**
   * A player leaves a finished game. The seat stays, with the same name, so the table the others
   * still look at keeps its engine player order, names and scores.
   */
  private depart(seat: number) {
    const human = this.seats[seat] as Human;
    this.seats[seat] = {
      state: 'computer',
      name: human.nickname,
      difficulty: 'random',
      risk: 'random',
      former: { playerId: human.playerId, nickname: human.nickname },
    };
    this.add('left', seat);
  }

  setSeat(
    playerId: string,
    seat: number,
    mode: 'open' | 'locked' | 'computer',
    difficulty: Difficulty = 'medium',
    risk: Risk = 'medium',
  ): Res<{ removed?: string }> {
    if (playerId !== this.hostId) return fail('notHost');
    if (this.phase !== 'lobby') return fail('gameStarted');
    const current = this.seats[seat];
    if (!current) return fail('invalidRequest');
    if (current.state === 'reserved') return fail('seatOccupied');
    let removed: string | undefined;
    if (mode === 'computer') {
      if (current.state === 'human') {
        if (current.playerId === this.hostId) return fail('seatOccupied');
        removed = current.playerId;
      }
      this.seats[seat] = this.computerSeat(current, difficulty, risk);
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

  /** Host removes a human and bans them from this game; the seat stays open for others. */
  removeSeat(playerId: string, seat: number): Res<{ removed: string }> {
    if (playerId !== this.hostId) return fail('notHost');
    if (this.phase !== 'lobby') return fail('gameStarted');
    const current = this.seats[seat];
    if (
      (current?.state !== 'human' && current?.state !== 'reserved') ||
      current.playerId === this.hostId
    )
      return fail('seatNotFree');
    this.banned.add(current.playerId);
    this.seats[seat] = { state: 'open' };
    this.resetReady();
    this.add('seatChanged', seat, 'open');
    this.emit();
    return { ok: true, removed: current.playerId };
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
        return s.state === 'human' ? s.nickname : (s as ComputerSeat).name;
      }),
      this.rules,
      this.rng,
    );
    // players who did not come back for the rematch lose their seat
    this.seats.forEach((seat, i) => {
      if (seat.state !== 'reserved') return;
      this.dropped.add(seat.playerId);
      this.seats[i] = { state: 'open' };
    });
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
    if (this.paused) return fail('paused');
    const res = this.apply(action);
    const human = this.seats[seat];
    if (res.ok && human.state === 'human') human.timeouts = 0;
    return res;
  }

  setPreview(playerId: string, dice: number[]): Res {
    if (this.phase !== 'running' || !this.game) return fail('notInGame');
    const seat = this.seatOf(playerId);
    if (seat < 0) return fail('notInGame');
    if (seat !== this.currentSeat()) return fail('notYourTurn');
    if (this.paused) return fail('paused');
    const n = this.game.turn?.dice.length ?? 0;
    if (new Set(dice).size !== dice.length || dice.some((d) => d < 0 || d >= n))
      return fail('invalidRequest');
    this.preview = dice;
    this.emit();
    return { ok: true };
  }

  /** Host only, lobby or running game. `changes` lists the values that really changed. */
  setSettings(
    playerId: string,
    patch: GameSettings,
  ): Res<{ changes: SettingChange[]; evicted: string[] }> {
    if (playerId !== this.hostId) return fail('notHost');
    if (this.phase === 'finished') return fail('notInGame');
    if (patch.computerSpeed !== undefined && !isComputerSpeed(patch.computerSpeed))
      return fail('invalidRequest');
    const changes: SettingChange[] = [];
    if (patch.computerSpeed !== undefined && patch.computerSpeed !== this.computerSpeed) {
      this.computerSpeed = patch.computerSpeed;
      changes.push({ setting: 'computerSpeed', value: patch.computerSpeed });
      this.rearmComputer();
    }
    if (patch.fastComputerDice !== undefined && patch.fastComputerDice !== this.fastComputerDice) {
      this.fastComputerDice = patch.fastComputerDice;
      changes.push({ setting: 'fastComputerDice', value: patch.fastComputerDice });
    }
    if (
      patch.showBustProbability !== undefined &&
      patch.showBustProbability !== this.showBustProbability
    ) {
      this.showBustProbability = patch.showBustProbability;
      changes.push({ setting: 'showBustProbability', value: patch.showBustProbability });
    }
    let evicted: string[] = [];
    if (patch.spectating !== undefined && patch.spectating !== this.spectating) {
      this.spectating = patch.spectating;
      changes.push({ setting: 'spectating', value: patch.spectating });
      if (!patch.spectating) evicted = this.evictSpectators();
    }
    if (changes.length > 0) this.emit();
    return { ok: true, changes, evicted };
  }

  /** Host only: freezes or continues a running game, keeping what is left of every wait. */
  setPaused(playerId: string, paused: boolean): Res {
    if (playerId !== this.hostId) return fail('notHost');
    if (this.phase !== 'running') return fail('notInGame');
    if (paused === this.paused) return { ok: true };
    this.paused = paused;
    if (paused) this.freezeTimers();
    else this.thawTimers();
    this.emit();
    return { ok: true };
  }

  private freezeTimers() {
    const frozen: NonNullable<GameRoom['frozen']> = {};
    if (this.computerTimer && this.pending) {
      frozen.computerElapsed = this.now() - this.pending.startedAt;
      clearTimeout(this.computerTimer);
      this.computerTimer = undefined;
    }
    if (this.turnTimer && this.turnDeadline) {
      frozen.turnLeft = Math.max(0, this.turnDeadline.at - this.now());
      this.stopTurnTimer();
    }
    this.frozen = frozen;
  }

  private thawTimers() {
    const { computerElapsed, turnLeft } = this.frozen ?? {};
    this.frozen = undefined;
    if (computerElapsed !== undefined && this.pending) {
      const { delayFor, run } = this.pending;
      this.pending.startedAt = this.now() - computerElapsed;
      const wait = Math.max(0, delayFor(pacing(this.computerSpeed)) - computerElapsed);
      this.computerTimer = setTimeout(run, wait);
    }
    if (turnLeft !== undefined) this.armTurnTimer(turnLeft);
  }

  /** `timeout`: the turn ends by a timeout, so its result notice is shown before this action's events. */
  private apply(action: Action, timeout = false): Res {
    const game = this.game as GameState;
    const seat = this.currentSeat();
    const outcome = applyAction(game, action, this.rng);
    if (!outcome.ok) return { ok: false, reason: 'rejected', engine: outcome.reason };
    this.game = outcome.state;
    this.preview = [];
    this.stopTurnTimer();
    const rollMax =
      this.seats[seat]?.state === 'computer' && this.fastComputerDice
        ? ROLL_MAX_FAST_MS
        : ROLL_MAX_MS;
    const thrown = outcome.events.some((e) => e.type === 'thrown');
    // a finished turn ends in a notice on every client before the next player may move
    const ended = outcome.events.some((e) => e.type === 'turnEnded');
    const notices = (p: Pacing) => (ended ? p.noticeMs : 0) + (timeout ? p.noticeMs : 0);
    this.computerDelay = (p) => (thrown ? rollMax + p.afterRollMs : p.pauseMs) + notices(p);
    this.turnDelay =
      (thrown ? ROLL_MAX_MS + HUMAN_AFTER_ROLL_MS : 0) + notices(pacing(this.computerSpeed));
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
    if (this.computerTimer || this.paused || this.phase !== 'running' || !this.game) return;
    if (this.seats[this.currentSeat()]?.state !== 'computer') return;
    // nobody to play against: wait (a rejoin emits and resumes), cleanup closes the room
    if (this.humans().length === 0) return;
    const stillMine = () => {
      this.computerTimer = undefined;
      const seat = this.seats[this.currentSeat()];
      return this.phase === 'running' && this.game && seat?.state === 'computer' ? seat : undefined;
    };
    this.armComputer(this.computerDelay, () => {
      const seat = stillMine();
      if (!seat || !this.game) return;
      const action = chooseAction(
        this.game,
        { difficulty: seat.difficulty, risk: seat.risk },
        this.rng,
      );
      if (action.type !== 'select') {
        this.apply(action);
        return;
      }
      // show the pick as a highlight before it is applied; the timer is set first so emit() does not reschedule
      this.preview = [...action.dice];
      this.armComputer(
        (p) => p.pauseMs,
        () => {
          if (stillMine()) this.apply(action);
        },
      );
      this.emit();
    });
  }

  private armComputer(delayFor: (p: Pacing) => number, run: () => void) {
    this.pending = { delayFor, run, startedAt: this.now() };
    this.computerTimer = setTimeout(run, delayFor(pacing(this.computerSpeed)));
  }

  /** A speed change takes effect at once: the pending step waits the new delay minus what has elapsed. */
  private rearmComputer() {
    if (!this.computerTimer || !this.pending) return;
    clearTimeout(this.computerTimer);
    const { delayFor, run, startedAt } = this.pending;
    const wait = Math.max(0, delayFor(pacing(this.computerSpeed)) - (this.now() - startedAt));
    this.computerTimer = setTimeout(run, wait);
  }

  /** Arms one limit per human turn step; kept across emits that change nothing about whose move it is. */
  private scheduleTurnTimer() {
    const phase = this.game?.turn?.phase;
    const human = this.phase === 'running' && this.seats[this.currentSeat()]?.state === 'human';
    if (!human || !phase) return this.stopTurnTimer();
    if (this.turnTimer || this.paused) return;
    this.armTurnTimer(this.turnDelay + TURN_LIMIT_MS[phase]);
  }

  private armTurnTimer(ms: number) {
    const phase = this.game?.turn?.phase;
    if (!phase) return;
    this.turnDeadline = { at: this.now() + ms, phase };
    this.turnTimer = setTimeout(() => this.turnExpired(), ms);
    this.turnTimer.unref(); // never keeps the process alive
  }

  private stopTurnTimer() {
    clearTimeout(this.turnTimer);
    this.turnTimer = undefined;
    this.turnDeadline = undefined;
  }

  /** Plays the automatic move for the idle human; the 3rd strike in a row hands the seat to a computer. */
  private turnExpired() {
    this.stopTurnTimer();
    const seat = this.currentSeat();
    const human = this.seats[seat];
    const phase = this.game?.turn?.phase;
    if (this.phase !== 'running' || !this.game || !phase || human?.state !== 'human') return;
    // no card is drawn for an idle player: a drawn Stop would read as their choice
    const action: Action | undefined =
      phase === 'select' || phase === 'draw'
        ? undefined
        : { type: phase === 'decide' ? 'bank' : phase };
    this.add('timedOut', seat, action?.type ?? 'skip');
    human.timeouts++;
    if (human.timeouts >= MAX_TIMEOUTS) this.replaceByBot(seat, 'timeouts');
    if (action) {
      this.apply(action, true);
      return;
    }
    this.game = skipTurn(this.game);
    this.preview = [];
    this.computerDelay = (p) => p.pauseMs + p.noticeMs;
    this.turnDelay = pacing(this.computerSpeed).noticeMs;
    this.emit();
  }

  // ---- connection, replacement

  setConnected(playerId: string, connected: boolean): void {
    const seat = this.seatOf(playerId);
    if (seat < 0) return;
    // nobody comes back to a finished game: a lost connection is a leave
    if (this.phase === 'finished' && !connected) {
      this.leave(playerId);
      return;
    }
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

  /** Hands a human seat to a computer of random skill and risk; the engine player and score stay. */
  private replaceByBot(seat: number, reason: ReplaceReason) {
    const human = this.seats[seat] as Human;
    this.clearGrace(seat);
    // the host's language, also when the host is the one leaving: the seat still holds it before an election
    const language = this.host()?.language ?? human.language;
    const name = this.newComputerName(language);
    this.seats[seat] = {
      state: 'computer',
      name,
      difficulty: 'random',
      risk: 'random',
      former: { playerId: human.playerId, nickname: human.nickname },
    };
    this.nameEnginePlayer(seat, name);
    if (seat === this.currentSeat()) this.preview = [];
    this.add('replaced', seat, reason);
  }

  private electHost(leaving: string) {
    const others = this.humans().filter((h) => h.playerId !== leaving);
    const next = others.find((h) => h.connected) ?? others[0];
    if (!next) return;
    this.setHost(next.playerId);
  }

  private setHost(playerId: string) {
    this.hostId = playerId;
    this.add('hostChanged', this.seatOf(playerId));
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
    this.stopTurnTimer();
  }

  private clearGrace(seat: number) {
    clearTimeout(this.graceTimers.get(seat));
    this.graceTimers.delete(seat);
  }

  private humanSeat(playerId: string, nickname: string, language: UiLanguage = 'en'): Seat {
    return {
      state: 'human',
      playerId,
      nickname,
      language,
      connected: true,
      ready: false,
      timeouts: 0,
    };
  }

  /** A computer that only changes skill keeps its name; any other seat gets a fresh one. */
  private computerSeat(current: Seat, difficulty: Difficulty, risk: Risk): ComputerSeat {
    const name =
      current.state === 'computer' ? current.name : this.newComputerName(this.hostLanguage());
    return { state: 'computer', name, difficulty, risk };
  }

  /** Lower-case names no new seat name may equal: players, computers and reserved former nicknames. */
  private takenNames(): Set<string> {
    const names = new Set<string>();
    for (const s of this.seats) {
      if (s.state === 'human' || s.state === 'reserved') names.add(s.nickname.toLowerCase());
      else if (s.state === 'computer') {
        names.add(s.name.toLowerCase());
        if (s.former) names.add(s.former.nickname.toLowerCase());
      }
    }
    return names;
  }

  /** Keeps the engine player's name equal to the name its room seat shows. */
  private nameEnginePlayer(seat: number, name: string) {
    const engine = this.seatOfEngine.indexOf(seat);
    if (this.game && engine >= 0) this.game = renamePlayer(this.game, engine, name);
  }

  private hostLanguage(): UiLanguage {
    return this.host()?.language ?? 'en';
  }

  private newComputerName(language: UiLanguage): string {
    return uniqueName(language, this.takenNames(), this.nameRng);
  }

  private resetReady() {
    for (const h of this.humans()) h.ready = false;
  }

  private add(kind: LogKind, seat?: number, data?: LogEntry['data']) {
    const entry: LogEntry = { at: this.now(), kind };
    if (seat !== undefined) entry.seat = seat;
    if (data !== undefined) entry.data = data;
    this.log.push(entry);
    if (this.log.length > LOG_CAP) {
      this.log.shift();
      this.logBase++;
    }
    this.fresh.push(entry);
  }

  private emit() {
    this.scheduleComputer();
    this.scheduleTurnTimer();
    const entries = this.fresh;
    this.fresh = [];
    this.onChange?.(entries);
  }
}
