import { same } from './equal.js';
import { applyGameDiff, diffGame } from './game-diff.js';
import {
  LOG_CAP,
  type GameChange,
  type GameView,
  type LogEntry,
  type WireView,
} from './protocol.js';
import { decodeLog, encodeLog } from './wire-log.js';

/** A change without its running number and with a rich log; `encodeChange` makes it sendable. */
export type ChangeParts = Omit<GameChange, 'n' | 'log'> & { log?: LogEntry[] };

/** A change as it travels (compact log), without its running number; the sender adds `n`. */
export type WireChangeParts = Omit<GameChange, 'n'>;

const SETTINGS = [
  'fastComputerDice',
  'computerSpeed',
  'showBustProbability',
  'spectating',
] as const;

/** Where the log ends: the stable index after its last entry. */
const logEnd = (v: Pick<GameView, 'logBase' | 'log'>): number => v.logBase + v.log.length;

/** Differences no change can express: another game or round, other seat count, a view that switches kind. */
function structural(prev: GameView, next: GameView): boolean {
  return (
    prev.id !== next.id ||
    prev.name !== next.name ||
    prev.round !== next.round ||
    prev.seats.length !== next.seats.length ||
    !same(prev.rules, next.rules) ||
    !!prev.you.spectator !== !!next.you.spectator ||
    (prev.preview !== undefined && next.preview === undefined)
  );
}

/**
 * The entries to append, or undefined when the log changed in another way. The log is append-only
 * between snapshots, and the client trims it exactly like the room does.
 */
function appended(prev: GameView, next: GameView): LogEntry[] | undefined {
  const added = logEnd(next) - logEnd(prev);
  const kept = prev.log.length + Math.max(added, 0);
  const base = prev.logBase + Math.max(0, kept - LOG_CAP);
  if (added < 0 || added > next.log.length || next.logBase !== base) return undefined;
  return added > 0 ? next.log.slice(next.log.length - added) : [];
}

/**
 * The game part: the whole state only for a recipient who has none (`null` = no game), else the
 * difference. `'structural'` when the difference cannot be expressed.
 */
function gameParts(prev: GameView, next: GameView): ChangeParts | 'structural' {
  if (!prev.game) return next.game ? { game: next.game } : {};
  if (!next.game) return { game: null };
  const diff = diffGame(prev.game, next.game);
  if (diff === 'structural') return 'structural';
  return diff ? { gameDiff: diff } : {};
}

const YOU_KEYS = ['playerId', 'seat', 'timeoutWarning', 'reserved', 'spectator'] as const;

/** Only the flags of `you` that differ; a removed `reserved` is sent as `null`. */
function youParts(prev: GameView['you'], next: GameView['you']): GameChange['you'] {
  const changed: Record<string, unknown> = {};
  for (const key of YOU_KEYS) {
    if (prev[key] === next[key]) continue;
    changed[key] = next[key] ?? (key === 'reserved' ? null : undefined);
  }
  return Object.keys(changed).length > 0 ? (changed as GameChange['you']) : undefined;
}

/** `you` with a change merged in; `reserved: null` removes the key. */
function mergeYou(you: GameView['you'], change: NonNullable<GameChange['you']>): GameView['you'] {
  const { reserved, ...rest } = change;
  const next = { ...you, ...rest };
  if (reserved === null) delete next.reserved;
  else if (reserved !== undefined) next.reserved = reserved;
  return next;
}

/**
 * Rule D: a change that moves the turn, ends the game, removes it or pauses it also ends the
 * running turn limit, so the recipient drops `turnDeadline` by itself and the sender need not say so.
 */
function clearsDeadline(change: Pick<GameChange, 'game' | 'gameDiff' | 'paused'>): boolean {
  const diff = change.gameDiff;
  return (
    change.game === null ||
    change.paused === true ||
    diff?.current !== undefined ||
    diff?.result !== undefined ||
    (!!diff?.turn && 'phase' in diff.turn)
  );
}

/** The new `turnDeadline`, or `null` to clear it, unless rule D already does so for this change. */
function deadlineParts(prev: GameView, next: GameView, change: ChangeParts): ChangeParts {
  const clears = clearsDeadline(change);
  if (next.turnDeadline) {
    // rule D would drop a kept deadline, so it is sent again
    return !same(prev.turnDeadline, next.turnDeadline) || clears
      ? { turnDeadline: next.turnDeadline }
      : {};
  }
  return prev.turnDeadline && !clears ? { turnDeadline: null } : {};
}

/** The parts of the view that are plain values or small objects. */
function valueParts(prev: GameView, next: GameView): ChangeParts {
  const change: ChangeParts = {};
  const you = youParts(prev.you, next.you);
  if (you) change.you = you;
  if (prev.hostId !== next.hostId) change.hostId = next.hostId;
  if (prev.phase !== next.phase) change.phase = next.phase;
  if (prev.rematch !== next.rematch) change.rematch = next.rematch ?? null;
  if (next.preview !== undefined && !same(prev.preview, next.preview))
    change.preview = next.preview;
  if (prev.spectators !== next.spectators) change.spectators = next.spectators;
  if (prev.paused !== next.paused) change.paused = next.paused;
  return change;
}

/** The host settings that differ, and the seats that differ by index. */
function listParts(prev: GameView, next: GameView): ChangeParts {
  const change: ChangeParts = {};
  const settings: NonNullable<GameChange['settings']> = {};
  for (const key of SETTINGS)
    if (prev[key] !== next[key]) Object.assign(settings, { [key]: next[key] });
  if (Object.keys(settings).length > 0) change.settings = settings;
  const seats = next.seats.flatMap((s, i): [number, typeof s][] =>
    same(prev.seats[i], s) ? [] : [[i, s]],
  );
  if (seats.length > 0) change.seats = seats;
  return change;
}

/**
 * What the recipient must apply to get from `prev` (the view they have) to `next`.
 * `null`: nothing differs. `'snapshot'`: the difference cannot be expressed as a change.
 * `applyChange(prev, { n, ...diffView(prev, next) })` equals `next` apart from `n`.
 */
export function diffView(prev: GameView, next: GameView): ChangeParts | 'snapshot' | null {
  if (structural(prev, next)) return 'snapshot';
  const log = appended(prev, next);
  if (!log) return 'snapshot';
  const game = gameParts(prev, next);
  if (game === 'structural') return 'snapshot';
  const change: ChangeParts = { ...valueParts(prev, next), ...game, ...listParts(prev, next) };
  Object.assign(change, deadlineParts(prev, next, change));
  if (log.length > 0) change.log = log;
  return Object.keys(change).length > 0 ? change : null;
}

/** The sendable form of the parts `diffView` found. */
export function encodeChange(parts: ChangeParts): WireChangeParts {
  const { log, ...rest } = parts;
  return log ? { ...rest, log: encodeLog(log) } : rest;
}

/** A view with the log in its compact form, for snapshots. */
export const encodeView = (view: GameView): WireView => ({ ...view, log: encodeLog(view.log) });

/** The view a snapshot holds, with the rich log the UI reads. */
export const decodeView = (view: WireView): GameView => ({ ...view, log: decodeLog(view.log) });

/** Sets or, for `null`, removes an optional field. */
function put<K extends keyof GameView>(view: GameView, key: K, value: GameView[K] | null): void {
  if (value === null) delete view[key];
  else view[key] = value;
}

/** The view after a change. Pure: the given view is not modified. */
export function applyChange(view: GameView, change: GameChange): GameView {
  const next: GameView = { ...view, n: change.n };
  if (change.you) next.you = mergeYou(view.you, change.you);
  if (change.hostId !== undefined) next.hostId = change.hostId;
  if (change.phase !== undefined) next.phase = change.phase;
  if (change.rematch !== undefined) put(next, 'rematch', change.rematch);
  if (change.game !== undefined) put(next, 'game', change.game);
  // a difference without a game to apply it to is a lost change: the caller asks for `game:sync`
  else if (change.gameDiff && view.game) next.game = applyGameDiff(view.game, change.gameDiff);
  if (change.preview) next.preview = change.preview;
  if (change.turnDeadline !== undefined) put(next, 'turnDeadline', change.turnDeadline);
  else if (clearsDeadline(change)) delete next.turnDeadline;
  if (change.settings) Object.assign(next, change.settings);
  if (change.spectators !== undefined) next.spectators = change.spectators;
  if (change.paused !== undefined) next.paused = change.paused;
  if (change.seats) next.seats = replaceSeats(view.seats, change.seats);
  if (change.log?.length) Object.assign(next, appendLog(view, decodeLog(change.log)));
  return next;
}

function replaceSeats(seats: GameView['seats'], changed: NonNullable<GameChange['seats']>) {
  const next = [...seats];
  for (const [index, seat] of changed) next[index] = seat;
  return next;
}

/** The log with the entries appended, trimmed to `LOG_CAP` like the room does. */
function appendLog(view: GameView, entries: LogEntry[]): Pick<GameView, 'log' | 'logBase'> {
  const log = [...view.log, ...entries];
  const drop = Math.max(0, log.length - LOG_CAP);
  return { log: drop > 0 ? log.slice(drop) : log, logBase: view.logBase + drop };
}
