import type { Action, Event, GameState, RejectionReason, Rules } from './types.js';

export const PROTOCOL_VERSION = 11;

/** UI language a player reports; the server names computers in the host's language. */
export type UiLanguage = 'en' | 'de';
export const UI_LANGUAGES: readonly UiLanguage[] = ['en', 'de'];
export const isUiLanguage = (x: unknown): x is UiLanguage => UI_LANGUAGES.includes(x as UiLanguage);

export type Difficulty = 'easy' | 'medium' | 'hard' | 'random';
export type Risk = 'none' | 'medium' | 'high' | 'random';
export type RoomPhase = 'lobby' | 'running' | 'finished';

export type ErrorReason =
  | 'noSession'
  | 'versionMismatch'
  | 'invalidRequest'
  | 'invalidNickname'
  | 'nicknameTaken'
  | 'invalidPassword'
  | 'wrongPassword'
  | 'locked'
  | 'gameNotFound'
  | 'gameStarted'
  | 'gameFull'
  | 'seatNotFree'
  | 'seatOccupied'
  | 'alreadyInGame'
  | 'notInGame'
  | 'notHost'
  | 'notReady'
  | 'banned'
  /** The game is not running, or the host switched spectating off. */
  | 'notSpectatable'
  | 'notRejoinable'
  | 'notEnoughPlayers'
  | 'notYourTurn'
  | 'paused'
  | 'rejected'
  /** A rematch request refers to an earlier round of the room. */
  | 'staleRound'
  /** Client-side only: the intent was not sent because the connection is down. */
  | 'offline';

export interface ErrorAck {
  ok: false;
  reason: ErrorReason;
  /** `wrongPassword` only. */
  attemptsLeft?: number;
  /** `locked` only. */
  retryAfterMs?: number;
  /** `rejected` only. */
  engine?: RejectionReason;
}

export type Ack<T = object> = ({ ok: true } & T) | ErrorAck;

export type LogKind =
  | 'joined'
  | 'left'
  | 'disconnected'
  | 'reconnected'
  | 'hostChanged'
  | 'seatChanged'
  | 'started'
  | 'turn'
  | 'finished'
  | 'replaced'
  | 'rejoined'
  | 'timedOut'
  | 'removed'
  | 'renamed'
  | 'rematch';

export interface LogEntry {
  at: number;
  kind: LogKind;
  seat?: number;
  data?: Event | number | string;
}

export interface SeatView {
  state: 'open' | 'locked' | 'human' | 'computer' | 'reserved';
  playerId?: string;
  nickname?: string;
  /** Computer seat: authoritative display name. */
  name?: string;
  connected?: boolean;
  ready?: boolean;
  difficulty?: Difficulty;
  risk?: Risk;
  /** Computer seat that replaced a human. */
  former?: { nickname: string };
}

/** Engine state without the deck (never sent), plus its size. */
export type GameStateView = Omit<GameState, 'deck'> & { deckSize: number };

export interface GameView {
  id: string;
  name: string;
  phase: RoomPhase;
  rules: Rules;
  hostId: string;
  /**
   * `seat` is -1 without a seat. A player who waits for the rematch gets the finished game
   * (`phase: 'finished'`, `rematch` set) with their seat of that game and `reserved` = the seat held for them.
   */
  you: {
    playerId: string;
    seat: number;
    timeoutWarning: boolean;
    reserved?: number;
    /** Anonymous read-only viewer; `seat` is -1. */
    spectator?: boolean;
  };
  /** Game number in this room, starting at 1; each rematch adds one. A waiting player's view has the finished game's round. */
  round: number;
  /** Only for a player waiting after a rematch: `open` = a reserved seat to rejoin, `closed` = the next game started without them. */
  rematch?: 'open' | 'closed';
  seats: SeatView[];
  game?: GameStateView;
  /** Dice indices the active player has ticked so far (not yet confirmed). */
  preview?: number[];
  /** Set only while a human is to act; `at` already includes the dice animation wait. */
  turnDeadline?: { at: number; phase: 'draw' | 'throw' | 'select' | 'decide' };
  /** Host setting: computer dice roll for a shorter time (the dice roll only, not the waits). */
  fastComputerDice: boolean;
  /** Host setting: computer speed 1 (slow) to 5 (fast); see `pacing`. */
  computerSpeed: number;
  /** Host setting: show next-throw bust odds to everyone at the table. */
  showBustProbability: boolean;
  /** Host setting: visitors may watch the running game. */
  spectating: boolean;
  /** Number of spectators watching right now. */
  spectators: number;
  /** Host paused the running game: no computer move, no turn limit, no action. */
  paused: boolean;
  /** Entries dropped from the front of `log` so far; `logBase + i` is the stable index of `log[i]`. */
  logBase: number;
  log: LogEntry[];
}

export interface GameSummary {
  id: string;
  name: string;
  host: string;
  targetScore: number;
  seatsUsed: number;
  seatsTotal: number;
  /** Password-protected (open games have none). */
  protected: boolean;
  /** The requesting player's own bot-held seat is in this game. */
  rejoinable: boolean;
  /** The host removed the requesting player from this game. */
  banned: boolean;
  /** The requesting player is the last host of a running game with only computers left and may end it. */
  closable: boolean;
  phase: RoomPhase;
  /** Running and the host allows spectators: the list offers "Watch". */
  spectatable: boolean;
}

/** Client to server: event name -> [payload, ack data]. */
export interface Intents {
  'session:start': [
    { nickname: string; token?: string; protocolVersion: number; language: UiLanguage },
    { token: string; playerId: string; nickname: string; protocolVersion: number; game?: GameView },
  ];
  'session:language': [{ language: UiLanguage }, object];
  'lobby:list': [undefined, { games: GameSummary[] }];
  'game:create': [
    { name: string; password: string; seats: number; rules: Rules },
    { game: GameView },
  ];
  'game:join': [{ gameId: string; password: string; seat?: number }, { game: GameView }];
  /** Watch a running game without a seat; same password rule and rate limit as `game:join`. */
  'game:spectate': [{ gameId: string; password: string }, { game: GameView }];
  'game:leave': [undefined, object];
  'seat:set': [
    { seat: number; mode: 'open' | 'locked' | 'computer'; difficulty?: Difficulty; risk?: Risk },
    object,
  ];
  'seat:rename': [{ seat: number; name?: string }, object];
  'seat:ready': [{ ready: boolean }, object];
  'game:start': [undefined, object];
  'game:rejoin': [{ gameId: string }, { game: GameView }];
  /** Last host ends a running game that only has computers left; `notHost` once a human took over. */
  'game:end': [{ gameId: string }, object];
  'seat:remove': [{ seat: number }, object];
  'turn:action': [{ action: Action }, object];
  'turn:preview': [{ dice: number[] }, object];
  'game:settings': [GameSettings, object];
  'game:pause': [{ paused: boolean }, object];
  /** Host of a finished game reopens the room as a lobby; `round` is the finished game's round. */
  'rematch:start': [{ round: number }, object];
  /** A player waiting in the game-over modal takes their reserved seat; `round` is the finished game's round. */
  'rematch:join': [{ round: number }, { game: GameView }];
}

export interface GameSettings {
  fastComputerDice?: boolean;
  computerSpeed?: number;
  showBustProbability?: boolean;
  spectating?: boolean;
}

export interface SettingChange {
  setting: keyof GameSettings;
  value: number | boolean;
}

/** Server to client pushes: event name -> payload. */
export interface Pushes {
  'lobby:games': { games: GameSummary[] };
  'game:state': { game: GameView };
  'game:log': { entries: LogEntry[] };
  'game:settingsChanged': { by: string; changes: SettingChange[] };
  'session:replaced': undefined;
  'game:closed': { reason: 'cleanup' | 'banned' | 'ended' | 'spectatingOff' };
}
