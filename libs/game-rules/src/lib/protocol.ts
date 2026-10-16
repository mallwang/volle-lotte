import type { Action, Event, GameState, RejectionReason, Rules } from './types.js';

export const PROTOCOL_VERSION = 4;

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
  | 'banned'
  | 'notRejoinable'
  | 'notEnoughPlayers'
  | 'notYourTurn'
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
  | 'replaced'
  | 'rejoined'
  | 'timedOut'
  | 'removed';

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
  you: { playerId: string; seat: number; timeoutWarning: boolean };
  seats: SeatView[];
  game?: GameStateView;
  /** Dice indices the active player has ticked so far (not yet confirmed). */
  preview?: number[];
  /** Set only while a human is to act; `at` already includes the dice animation wait. */
  turnDeadline?: { at: number; phase: 'draw' | 'throw' | 'select' | 'decide' };
  /** Host setting: computer dice roll for a shorter time. */
  fastComputerDice: boolean;
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
  'game:rejoin': [{ gameId: string }, { game: GameView }];
  'seat:remove': [{ seat: number }, object];
  'turn:action': [{ action: Action }, object];
  'turn:preview': [{ dice: number[] }, object];
  'game:settings': [{ fastComputerDice: boolean }, object];
}

/** Server to client pushes: event name -> payload. */
export interface Pushes {
  'lobby:games': { games: GameSummary[] };
  'game:state': { game: GameView };
  'game:log': { entries: LogEntry[] };
  'session:replaced': undefined;
  'game:closed': { reason: 'cleanup' | 'banned' };
}
