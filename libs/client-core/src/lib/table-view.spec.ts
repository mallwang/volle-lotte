import type { GameView, Turn } from 'game-rules';
import { defaultRules } from 'game-rules';
import {
  discardLayers,
  layerTransform,
  nextThrowRisk,
  pileLevel,
  playedCards,
  safeLabel,
  seatAlign,
  seatAreas,
  seatRows,
  seatViews,
  totalCards,
} from './table-view.js';

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
  it('seats clockwise from the top left, bottom seats in the corners', () => {
    expect(seatAreas(2)).toEqual(['l1', 'r1']);
    expect(seatAreas(3)).toEqual(['l1', 'r1', 'r2']);
    expect(seatAreas(4)).toEqual(['l1', 'r1', 'r2', 'l2']);
    expect(seatAreas(5)).toEqual(['l1', 'r1', 'r2', 'r3', 'l3']);
    expect(seatAreas(6)).toEqual(['l1', 'r1', 'r2', 'r3', 'l3', 'l2']);
    expect(seatAlign('l1', 3)).toBe('start');
    expect(seatAlign('r2', 3)).toBe('center');
    expect(seatAlign('l3', 3)).toBe('end');
    expect(seatAlign('l1', 1)).toBe('center');
    expect(seatAreas(0)).toEqual([]);
    expect(seatAreas(9)).toHaveLength(8);
    expect(seatRows(5)).toBe(3);
  });

  describe('nextThrowRisk', () => {
    const rules = defaultRules();
    const turn = (over: Partial<Turn> = {}): Turn => ({
      phase: 'select',
      card: 'bonus200',
      dice: [1, 5, 2, 3, 4, 6],
      free: 6,
      run: 0,
      carried: 0,
      street: [],
      volleLottes: 0,
      ...over,
    });

    it('previews the free dice after a valid selection', () => {
      expect(nextThrowRisk(turn(), [0], rules)).toBeCloseTo(0.07716, 4);
      expect(nextThrowRisk(turn(), [0, 1], rules)).toBeCloseTo(0.157407, 5);
      expect(nextThrowRisk(turn({ phase: 'decide', free: 1 }), [], rules)).toBeCloseTo(2 / 3);
    });

    it.each([[], [2], [0, 2], [-1], [6], [0, 0], [0.5]])(
      'hides the hint for an empty or invalid selection %j',
      (...selected) => {
        expect(nextThrowRisk(turn(), selected, rules)).toBeNull();
      },
    );

    it('previews the still-missing Street faces', () => {
      const street = turn({ card: 'street', free: 4, street: [1, 6], dice: [2, 2, 4, 6] });
      expect(nextThrowRisk(street, [0, 2], rules)).toBeCloseTo((4 / 6) ** 2, 12);
      expect(nextThrowRisk(street, [0, 1], rules)).toBeNull();
      expect(nextThrowRisk(street, [3], rules)).toBeNull();
    });

    it('has no next throw after a Volle Lotte, except the first Clover pass', () => {
      const all = turn({ dice: [1, 1, 1, 5, 5, 5] });
      const selected = [0, 1, 2, 3, 4, 5];
      expect(nextThrowRisk(all, selected, rules)).toBeNull();
      expect(nextThrowRisk({ ...all, card: 'clover' }, selected, rules)).toBeCloseTo(0.030864, 5);
      expect(nextThrowRisk({ ...all, card: 'clover', volleLottes: 1 }, selected, rules)).toBeNull();
      expect(nextThrowRisk(turn({ phase: 'draw', free: 0 }), [], rules)).toBeNull();
      expect(nextThrowRisk(turn({ phase: 'decide', free: 0 }), [], rules)).toBeNull();
    });
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
    expect([0, 1, 2, 6, 7, 48, 200].map(discardLayers)).toEqual([0, 0, 1, 1, 1, 8, 8]);
    expect(layerTransform(3)).toEqual(layerTransform(3));
    expect(layerTransform(0).rot).toBeCloseTo(-12.1);
    expect(layerTransform(0)).toMatchObject({ x: -4, y: -3 });
  });
});

describe('safeLabel', () => {
  const turn = (t: Partial<Turn>): Turn =>
    ({ card: 'bonus200', free: 6, carried: 0, run: 0, street: [], volleLottes: 0, ...t }) as Turn;

  it('names points on point cards and the previous run when carried', () => {
    expect(safeLabel(turn({ run: 250 }))).toMatchObject({ key: 'table.safe.points' });
    expect(safeLabel(turn({ carried: 350 })).key).toBe('table.safe.carried');
  });

  it('shows dice progress on goal cards', () => {
    expect(safeLabel(turn({ card: 'plusMinus', free: 5 }))).toMatchObject({
      key: 'table.safe.goal',
      params: { done: 1, left: 5 },
    });
    expect(safeLabel(turn({ card: 'street', street: [1, 2] })).params).toMatchObject({ left: 4 });
    expect(safeLabel(turn({ card: 'clover', volleLottes: 1, free: 4, carried: 5 }))).toMatchObject({
      key: 'table.safe.cloverStake',
      params: { pass: 2, done: 8, left: 4 },
    });
  });
});
