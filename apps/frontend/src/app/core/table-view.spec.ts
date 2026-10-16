import type { GameView } from 'game-rules';
import { defaultRules } from 'game-rules';
import {
  discardLayers,
  layerTransform,
  pileLevel,
  playedCards,
  seatAreas,
  seatRows,
  seatViews,
  totalCards,
} from './table-view';

const view = (n: number, current: number, youSeat: number): GameView =>
  ({
    you: { playerId: 'x', seat: youSeat, timeoutWarning: false },
    seats: Array.from({ length: n }, (_, i) => ({
      state: i === 1 ? 'computer' : 'human',
      connected: i !== 2,
      nickname: `P${i}`,
    })),
    game: {
      players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, score: i * 10 })),
      current,
    },
  }) as unknown as GameView;

describe('table-view', () => {
  it('fills the sides top to bottom, alternating left and right', () => {
    expect(seatAreas(5)).toEqual(['l1', 'r1', 'l2', 'r2', 'l3']);
    expect(seatAreas(0)).toEqual([]);
    expect(seatAreas(9)).toHaveLength(8);
    expect(seatRows(5)).toBe(3);
  });

  it.each([0, 1, 2, 3])('rotates so that seat %i is first', (me) => {
    const s = seatViews(view(4, 2, me));
    expect(s[0]).toMatchObject({ you: true, area: 'l1', name: `P${me}` });
    expect(s.map((x) => x.name)).toEqual([0, 1, 2, 3].map((k) => `P${(me + k) % 4}`));
    expect(s.filter((x) => x.active)).toHaveLength(1);
  });

  it('maps computer, offline and active', () => {
    const s = seatViews(view(3, 2, 0));
    expect(s[1].computer).toBe(true);
    expect(s[2]).toMatchObject({ online: false, active: true, computer: false });
    expect(s[2].score).toBe(20);
  });

  it('keeps engine order without an own seat and without a game', () => {
    expect(seatViews(view(3, 0, -1)).map((x) => x.name)).toEqual(['P0', 'P1', 'P2']);
    expect(seatViews({ ...view(2, 0, 0), game: null } as unknown as GameView)).toEqual([]);
  });

  it('counts cards and played cards', () => {
    const total = totalCards(defaultRules());
    expect(total).toBeGreaterThan(0);
    expect(playedCards(total, total - 7, true)).toBe(6);
    expect(playedCards(total, total, false)).toBe(0);
    expect(playedCards(10, 10, true)).toBe(0);
  });

  it('derives the pile level', () => {
    expect(pileLevel(0, 60)).toBe('empty');
    expect(pileLevel(5, 0)).toBe('empty');
    expect(pileLevel(10, 60)).toBe('few');
    expect(pileLevel(11, 60)).toBe('medium');
    expect(pileLevel(30, 60)).toBe('medium');
    expect(pileLevel(31, 60)).toBe('many');
  });

  it('derives discard layers and a stable jitter', () => {
    expect([0, 1, 6, 7, 48, 200].map(discardLayers)).toEqual([0, 1, 1, 2, 8, 8]);
    expect(layerTransform(3)).toEqual(layerTransform(3));
    expect(layerTransform(0).rot).toBeCloseTo(-12.1);
    expect(layerTransform(0)).toMatchObject({ x: -4, y: -3 });
  });
});
