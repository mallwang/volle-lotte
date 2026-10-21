import type { GameView, Rules, Turn } from 'game-rules';
import { bustProbability, scoreDice } from 'game-rules';
import { playerSeats } from './game-view.js';

/** Grid area of a seat: side (l/r) and row from the top, e.g. `l1`, `r1`, `l2`. */
export type SeatArea = `${'l' | 'r'}${number}`;
export type PileLevel = 'many' | 'medium' | 'few' | 'empty';

export interface TableSeat {
  name: string;
  score: number;
  computer: boolean;
  online: boolean;
  active: boolean;
  you: boolean;
  area: SeatArea;
}

/** Seats run clockwise from the top left: down the right side, then up the left. */
export const seatAreas = (count: number): readonly SeatArea[] => {
  const n = Math.min(Math.max(count, 0), 8);
  const rows = Math.ceil(n / 2);
  const right = Array.from({ length: rows }, (_, k) => `r${k + 1}`);
  const left = Array.from({ length: rows - 1 }, (_, k) => `l${rows - k}`);
  return ['l1', ...right, ...left].slice(0, n) as SeatArea[];
};

/** Top seats sit flush at the top, bottom seats at the bottom, the rest in the middle. */
export const seatAlign = (area: SeatArea, rows: number): 'start' | 'end' | 'center' => {
  const row = Number(area.slice(1));
  if (rows < 2 || (row > 1 && row < rows)) return 'center';
  return row === 1 ? 'start' : 'end';
};

/** Rows needed on each side. */
export const seatRows = (count: number): number => Math.ceil(Math.min(Math.max(count, 0), 8) / 2);

/** Players in turn order, own seat first (top left). Without an own seat (replaced) engine order. */
export function seatViews(g: GameView): TableSeat[] {
  const state = g.game;
  if (!state) return [];
  const seats = playerSeats(g);
  const start = Math.max(0, seats.indexOf(g.you.seat));
  const n = state.players.length;
  const areas = seatAreas(n);
  return Array.from({ length: n }, (_, k) => {
    const i = (start + k) % n;
    const seat = g.seats[seats[i]];
    return {
      name: state.players[i].name,
      score: state.players[i].score,
      computer: seat?.state === 'computer',
      online: seat?.connected !== false,
      active: i === state.current,
      you: seats[i] === g.you.seat,
      area: areas[k],
    };
  });
}

export const totalCards = (rules: Rules): number =>
  Object.values(rules.cardCounts).reduce((a, b) => a + b, 0);

/** Cards neither in the draw pile nor face up: the discard pile. */
export const playedCards = (total: number, deckSize: number, hasActive: boolean): number =>
  Math.max(0, total - deckSize - (hasActive ? 1 : 0));

export function pileLevel(deckSize: number, total: number): PileLevel {
  if (deckSize <= 0 || total <= 0) return 'empty';
  const r = deckSize / total;
  if (r <= 1 / 6) return 'few';
  return r <= 1 / 2 ? 'medium' : 'many';
}

export const discardLayers = (played: number): number =>
  Math.min(8, Math.ceil(Math.max(0, played - 1) / 6));

/** Next-throw odds, including a legal selection preview; no hint if there is no next throw. */
export function nextThrowRisk(
  turn: Turn,
  selected: readonly number[],
  rules: Rules,
): number | null {
  if (turn.phase === 'draw') return null;
  let free = turn.free;
  let street = turn.card === 'street' ? turn.street : undefined;
  if (turn.phase === 'select') {
    if (
      selected.length === 0 ||
      new Set(selected).size !== selected.length ||
      selected.some((i) => !Number.isInteger(i) || i < 0 || i >= turn.dice.length)
    )
      return null;
    const values = selected.map((i) => turn.dice[i]);
    if (street) {
      if (new Set(values).size !== values.length || values.some((v) => turn.street.includes(v)))
        return null;
      street = [...street, ...values];
    } else if (scoreDice(values, rules) < 0) return null;
    free -= values.length;
    if (free === 0 && turn.card === 'clover' && turn.volleLottes === 0) free = 6;
  }
  return free > 0 ? bustProbability(free, rules.fourOfAKindDoubling, street) : null;
}

/** Stable untidy offset per layer (no randomness, so re-renders do not jump). */
export const layerTransform = (i: number): { rot: number; x: number; y: number } => ({
  rot: (((i * 47) % 23) - 11) * 1.1,
  x: ((i * 31) % 9) - 4,
  y: ((i * 17) % 7) - 3,
});

/**
 * What the "secured" area says: points where there are points to collect, otherwise the progress
 * towards the goal (Street, Double Lotte, Plus/Minus, Clover). Carried points of an earlier run are
 * named, since the current card decides whether they are added or at stake.
 */
export function safeLabel(turn: Turn): { key: string; params: Record<string, number> } {
  const done = 6 - turn.free;
  const { carried } = turn;
  switch (turn.card) {
    case 'street':
      return {
        key: `table.safe.street${carried ? 'Stake' : ''}`,
        params: { done: turn.street.length, left: 6 - turn.street.length, carried },
      };
    case 'plusMinus':
    case 'doubleLotte':
      return {
        key: `table.safe.goal${carried ? 'Stake' : ''}`,
        params: { done, left: turn.free, carried },
      };
    case 'clover': {
      const all = turn.volleLottes * 6 + done;
      return {
        key: `table.safe.clover${carried ? 'Stake' : ''}`,
        params: { pass: turn.volleLottes + 1, done: all, left: 12 - all, carried },
      };
    }
    default:
      return {
        key: carried ? 'table.safe.carried' : 'table.safe.points',
        params: { points: turn.run, carried },
      };
  }
}
