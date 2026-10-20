import { same } from './equal.js';
import type { GameStateDiff, GameStateView } from './protocol.js';
import type { Turn } from './types.js';

/** The turn fields of `next` that differ from `prev`, or undefined when none does. */
function turnFields(prev: Turn, next: Turn): Partial<Turn> | undefined {
  const keys = [...new Set([...Object.keys(prev), ...Object.keys(next)])] as (keyof Turn)[];
  const changed = keys.filter((k) => !same(prev[k], next[k]));
  return changed.length > 0
    ? (Object.fromEntries(changed.map((k) => [k, next[k]])) as Partial<Turn>)
    : undefined;
}

function playerChanges(prev: GameStateView, next: GameStateView): GameStateDiff['players'] {
  const out: NonNullable<GameStateDiff['players']> = [];
  next.players.forEach((p, i) => {
    const old = prev.players[i];
    const changed: { name?: string; score?: number } = {};
    if (old.name !== p.name) changed.name = p.name;
    if (old.score !== p.score) changed.score = p.score;
    if (Object.keys(changed).length > 0) out.push([i, changed]);
  });
  return out.length > 0 ? out : undefined;
}

/**
 * What differs between two engine state views. `null`: nothing. `'structural'`: the number of
 * players differs, which no difference can express.
 */
export function diffGame(
  prev: GameStateView,
  next: GameStateView,
): GameStateDiff | 'structural' | null {
  if (prev.players.length !== next.players.length) return 'structural';
  const diff: GameStateDiff = {};
  const players = playerChanges(prev, next);
  if (players) diff.players = players;
  if (prev.current !== next.current) diff.current = next.current;
  if (prev.turn && next.turn) {
    const turn = turnFields(prev.turn, next.turn);
    if (turn) diff.turn = turn;
  } else if (prev.turn !== next.turn) diff.turn = next.turn;
  if (!same(prev.result, next.result)) diff.result = next.result;
  if (prev.deckSize !== next.deckSize) diff.deckSize = next.deckSize;
  return Object.keys(diff).length > 0 ? diff : null;
}

/** The state view after a difference. Pure: the given view is not modified. */
export function applyGameDiff(prev: GameStateView, diff: GameStateDiff): GameStateView {
  return {
    ...prev,
    players: diff.players ? changedPlayers(prev.players, diff.players) : prev.players,
    current: diff.current ?? prev.current,
    turn: diff.turn === undefined ? prev.turn : mergedTurn(prev.turn, diff.turn),
    result: diff.result === undefined ? prev.result : diff.result,
    deckSize: diff.deckSize ?? prev.deckSize,
  };
}

function changedPlayers(
  players: GameStateView['players'],
  changes: NonNullable<GameStateDiff['players']>,
): GameStateView['players'] {
  const next = [...players];
  for (const [index, changed] of changes) next[index] = { ...next[index], ...changed };
  return next;
}

const mergedTurn = (prev: Turn | null, diff: Partial<Turn> | null): Turn | null =>
  diff === null ? null : ({ ...prev, ...diff } as Turn);
