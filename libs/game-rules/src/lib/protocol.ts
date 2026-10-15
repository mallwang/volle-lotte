import type { Action, Event, GameState, RejectionReason, Rules } from './types.js';

export const PROTOCOL_VERSION = 1;

export type Difficulty = 'easy' | 'medium' | 'hard' | 'random';
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
  | 'notEnoughPlayers'
  | 'nothingPending'
  | 'notYourTurn'
  | 'paused'
  | 'rejected';

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
  | 'waitingForHost'
  | 'hostDecided';

export interface LogEntry {
  at: number;
  kind: LogKind;
  seat?: number;
  data?: Event | number | string;
}

export interface SeatView {
  state: 'open' | 'locked' | 'human' | 'computer';
  playerId?: string;
  nickname?: string;
  connected?: boolean;
  ready?: boolean;
  difficulty?: Difficulty;
}

/** Engine state without the deck (never sent), plus its size. */
export type GameStateView = Omit<GameState, 'deck'> & { deckSize: number };

export interface GameView {
  id: string;
  name: string;
  phase: RoomPhase;
  rules: Rules;
  hostId: string;
  you: { playerId: string; seat: number };
  seats: SeatView[];
  game?: GameStateView;
  pending: number[];
  graceEndsAt: Record<number, number>;
  log: LogEntry[];
}

export interface GameSummary {
  id: string;
  name: string;
  host: string;
  targetScore: number;
  seatsUsed: number;
  seatsTotal: number;
  locked: true;
  phase: RoomPhase;
}

/** Client to server: event name -> [payload, ack data]. */
export interface Intents {
  'session:start': [
    { nickname: string; token?: string; protocolVersion: number },
    { token: string; playerId: string; nickname: string; protocolVersion: number; game?: GameView },
  ];
  'lobby:list': [undefined, { games: GameSummary[] }];
  'game:create': [
    { name: string; password: string; seats: number; rules: Rules },
    { game: GameView },
  ];
  'game:join': [{ gameId: string; password: string; seat?: number }, { game: GameView }];
  'game:leave': [undefined, object];
  'seat:set': [
    { seat: number; mode: 'open' | 'locked' | 'computer'; difficulty?: Difficulty },
    object,
  ];
  'seat:ready': [{ ready: boolean }, object];
  'game:start': [undefined, object];
  'host:decide': [{ seat: number; decision: 'computer' | 'free'; difficulty?: Difficulty }, object];
  'turn:action': [{ action: Action }, object];
}

/** Server to client pushes: event name -> payload. */
export interface Pushes {
  'lobby:games': { games: GameSummary[] };
  'game:state': { game: GameView };
  'game:log': { entries: LogEntry[] };
  'session:replaced': undefined;
  'game:closed': { reason: 'cleanup' | 'removed' };
}
