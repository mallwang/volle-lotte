import type { GameView, Rules } from 'game-rules';
import { playerSeats } from './game-view';

/** Grid area of a seat around the table (top/bottom/left/right). */
export type SeatArea = 't' | 'tl' | 'tr' | 'l' | 'r' | 'b' | 'bl' | 'br';
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

/** Clockwise from the bottom; symmetric subsets of the 8 positions. */
const AREAS: readonly (readonly SeatArea[])[] = [
  [],
  ['b'],
  ['b', 't'],
  ['b', 'tl', 'tr'],
  ['b', 'l', 't', 'r'],
  ['b', 'l', 'tl', 'tr', 'r'],
  ['b', 'l', 'tl', 't', 'tr', 'r'],
  ['b', 'bl', 'l', 'tl', 'tr', 'r', 'br'],
  ['b', 'bl', 'l', 'tl', 't', 'tr', 'r', 'br'],
];

export const seatAreas = (count: number): readonly SeatArea[] =>
  AREAS[Math.min(Math.max(count, 0), 8)];

/** Players clockwise, own seat first (bottom). Without an own seat (replaced) engine order. */
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

export const discardLayers = (played: number): number => Math.min(8, Math.ceil(played / 6));

/** Stable untidy offset per layer (no randomness, so re-renders do not jump). */
export const layerTransform = (i: number): { rot: number; x: number; y: number } => ({
  rot: (((i * 47) % 23) - 11) * 1.1,
  x: ((i * 31) % 9) - 4,
  y: ((i * 17) % 7) - 3,
});
