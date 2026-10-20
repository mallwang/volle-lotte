import { LOG_CAP, type GameChange, type GameView, type LogEntry } from './protocol.js';

/** A change without its running number; the sender adds `n`. */
export type ChangeParts = Omit<GameChange, 'n'>;

const SETTINGS = [
  'fastComputerDice',
  'computerSpeed',
  'showBustProbability',
  'spectating',
] as const;

/** Structural equality for the JSON values of a view (plain objects, arrays, primitives). */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter((k) => left[k] !== undefined);
  if (keys.length !== Object.keys(right).filter((k) => right[k] !== undefined).length) return false;
  return keys.every((k) => same(left[k], right[k]));
}

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

/** The parts of the view that are plain values or small objects. */
function valueParts(prev: GameView, next: GameView): ChangeParts {
  const change: ChangeParts = {};
  if (!same(prev.you, next.you)) change.you = next.you;
  if (prev.hostId !== next.hostId) change.hostId = next.hostId;
  if (prev.phase !== next.phase) change.phase = next.phase;
  if (prev.rematch !== next.rematch) change.rematch = next.rematch ?? null;
  if (!same(prev.game, next.game)) change.game = next.game ?? null;
  if (next.preview !== undefined && !same(prev.preview, next.preview))
    change.preview = next.preview;
  if (!same(prev.turnDeadline, next.turnDeadline)) change.turnDeadline = next.turnDeadline ?? null;
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
  const change = { ...valueParts(prev, next), ...listParts(prev, next) };
  if (log.length > 0) change.log = log;
  return Object.keys(change).length > 0 ? change : null;
}

/** Sets or, for `null`, removes an optional field. */
function put<K extends keyof GameView>(view: GameView, key: K, value: GameView[K] | null): void {
  if (value === null) delete view[key];
  else view[key] = value;
}

/** The view after a change. Pure: the given view is not modified. */
export function applyChange(view: GameView, change: GameChange): GameView {
  const next: GameView = { ...view, n: change.n };
  if (change.you) next.you = change.you;
  if (change.hostId !== undefined) next.hostId = change.hostId;
  if (change.phase !== undefined) next.phase = change.phase;
  if (change.rematch !== undefined) put(next, 'rematch', change.rematch);
  if (change.game !== undefined) put(next, 'game', change.game);
  if (change.preview) next.preview = change.preview;
  if (change.turnDeadline !== undefined) put(next, 'turnDeadline', change.turnDeadline);
  if (change.settings) Object.assign(next, change.settings);
  if (change.spectators !== undefined) next.spectators = change.spectators;
  if (change.paused !== undefined) next.paused = change.paused;
  if (change.seats) next.seats = replaceSeats(view.seats, change.seats);
  if (change.log?.length) Object.assign(next, appendLog(view, change.log));
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
