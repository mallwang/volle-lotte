import { defaultRules, type SeatView } from 'game-rules';
import { gameView } from './testing.js';
import {
  defaultSetup,
  describeSetup,
  planComputers,
  sanitizeSetup,
  setupFromGame,
  setupsEqual,
  type Setup,
} from './setup.js';

const computer = (
  difficulty: 'easy' | 'hard' = 'easy',
  risk: 'none' | 'high' = 'none',
): SeatView => ({
  state: 'computer',
  difficulty,
  risk,
  name: 'Brave Fox',
});
const human: SeatView = { state: 'human', playerId: 'p', nickname: 'Bob' };
const open: SeatView = { state: 'open' };

describe('setup', () => {
  it('has the existing defaults', () => {
    expect(defaultSetup()).toEqual({
      seats: 4,
      rules: defaultRules(),
      computers: [],
      speed: 3,
      fastComputerDice: false,
      showBustProbability: false,
    });
  });

  describe('sanitizeSetup', () => {
    it.each([null, undefined, 'x', 5, [], {}])('gives the defaults for %j', (value) => {
      expect(sanitizeSetup(value)).toEqual(defaultSetup());
    });

    it('keeps valid values', () => {
      const setup: Setup = {
        seats: 6,
        rules: { ...defaultRules(), targetScore: 4000 },
        computers: [{ seat: 3, difficulty: 'hard', risk: 'high' }],
        speed: 5,
        fastComputerDice: true,
        showBustProbability: true,
      };
      expect(sanitizeSetup(JSON.parse(JSON.stringify(setup)))).toEqual(setup);
    });

    it('falls back per value', () => {
      const result = sanitizeSetup({
        seats: 99,
        speed: 9,
        rules: {
          targetScore: 3000,
          minimumPoints: -1,
          fourOfAKindDoubling: 'yes',
          cardCounts: { stop: -1, clover: 1e9, star: 2.5, bonus200: 7 },
        },
      });
      expect(result.seats).toBe(4);
      expect(result.speed).toBe(3);
      expect(result.rules.targetScore).toBe(3000);
      expect(result.rules.minimumPoints).toBe(defaultRules().minimumPoints);
      expect(result.rules.fourOfAKindDoubling).toBe(true);
      expect(result.rules.cardCounts.stop).toBe(defaultRules().cardCounts.stop);
      expect(result.rules.cardCounts.star).toBe(defaultRules().cardCounts.star);
      expect(result.rules.cardCounts.bonus200).toBe(7);
    });

    it('uses the default rules when the deck would be empty', () => {
      const zero = Object.fromEntries(Object.keys(defaultRules().cardCounts).map((k) => [k, 0]));
      expect(sanitizeSetup({ rules: { ...defaultRules(), cardCounts: zero } }).rules).toEqual(
        defaultRules(),
      );
    });

    it('drops invalid, duplicate and out-of-range computers', () => {
      const result = sanitizeSetup({
        seats: 4,
        computers: [
          { seat: 1, difficulty: 'easy', risk: 'none' },
          { seat: 1, difficulty: 'hard', risk: 'high' },
          { seat: 0, difficulty: 'easy', risk: 'none' },
          { seat: 4, difficulty: 'easy', risk: 'none' },
          { seat: 2, difficulty: 'genius', risk: 'none' },
          { seat: 3, difficulty: 'hard', risk: 'wild' },
          'junk',
          { seat: 3, difficulty: 'random', risk: 'random' },
        ],
      });
      expect(result.computers).toEqual([
        { seat: 1, difficulty: 'easy', risk: 'none' },
        { seat: 3, difficulty: 'random', risk: 'random' },
      ]);
    });

    it('ignores computers that are not a list', () => {
      expect(sanitizeSetup({ computers: 'many' }).computers).toEqual([]);
    });
  });

  describe('setupsEqual', () => {
    const a: Setup = {
      ...defaultSetup(),
      computers: [
        { seat: 1, difficulty: 'easy', risk: 'none' },
        { seat: 2, difficulty: 'hard', risk: 'high' },
      ],
    };

    it('ignores the order of the computers', () => {
      expect(setupsEqual(a, { ...a, computers: [...a.computers].reverse() })).toBe(true);
    });

    it('is false for null', () => {
      expect(setupsEqual(a, null)).toBe(false);
      expect(setupsEqual(null, a)).toBe(false);
    });

    it.each([
      ['seats', { ...a, seats: 5 }],
      ['speed', { ...a, speed: 4 }],
      ['target', { ...a, rules: { ...a.rules, targetScore: 1 } }],
      ['minimum', { ...a, rules: { ...a.rules, minimumPoints: 1 } }],
      ['doubling', { ...a, rules: { ...a.rules, fourOfAKindDoubling: false } }],
      [
        'card count',
        { ...a, rules: { ...a.rules, cardCounts: { ...a.rules.cardCounts, stop: 1 } } },
      ],
      ['computer count', { ...a, computers: a.computers.slice(1) }],
      ['computer seat', { ...a, computers: [{ ...a.computers[0], seat: 3 }, a.computers[1]] }],
      ['skill', { ...a, computers: [{ ...a.computers[0], difficulty: 'hard' }, a.computers[1]] }],
      ['risk', { ...a, computers: [{ ...a.computers[0], risk: 'high' }, a.computers[1]] }],
    ] as const)('detects a different %s', (_name, b) => {
      expect(setupsEqual(a, b as Setup)).toBe(false);
    });
  });

  it('reads the setup of a lobby view without computer names', () => {
    const game = gameView({ computerSpeed: 4 }, [
      human,
      computer('hard', 'high'),
      open,
      computer('easy', 'none'),
    ]);
    expect(setupFromGame(game)).toEqual({
      seats: 4,
      rules: game.rules,
      speed: 4,
      fastComputerDice: false,
      showBustProbability: false,
      computers: [
        { seat: 1, difficulty: 'hard', risk: 'high' },
        { seat: 3, difficulty: 'easy', risk: 'none' },
      ],
    });
  });

  it('counts the unlocked seats of a full-size room as the seat count', () => {
    const locked: SeatView = { state: 'locked' };
    const game = gameView({}, [human, open, computer(), open, locked, locked, locked, locked]);
    game.seats.length = 8;
    expect(setupFromGame(game).seats).toBe(4);
    const tiny = gameView({}, [human, locked, locked, locked]);
    expect(setupFromGame(tiny).seats).toBe(2);
  });

  it('describes a setup', () => {
    expect(
      describeSetup({
        ...defaultSetup(),
        computers: [{ seat: 1, difficulty: 'easy', risk: 'none' }],
      }),
    ).toEqual({ seats: 4, target: 6000, computers: 1, speed: 3 });
  });

  describe('planComputers', () => {
    const stored = [
      { seat: 2, difficulty: 'hard', risk: 'high' },
      { seat: 4, difficulty: 'easy', risk: 'none' },
    ] as const;

    it('restores the layout in a fresh room', () => {
      const seats = [human, open, open, open, open, open];
      expect(planComputers(seats, stored)).toEqual({ clear: [], place: [...stored], skipped: 0 });
    });

    it('moves a computer to the first free seat when its seat is taken', () => {
      const seats = [human, open, human, open, open];
      const plan = planComputers(seats, stored);
      expect(plan.place).toEqual([
        { seat: 1, difficulty: 'hard', risk: 'high' },
        { seat: 4, difficulty: 'easy', risk: 'none' },
      ]);
      expect(plan.skipped).toBe(0);
    });

    it('counts the computers that do not fit and never touches humans or locked seats', () => {
      const seats: SeatView[] = [human, human, { state: 'locked' }, open];
      const plan = planComputers(seats, stored);
      expect(plan.place).toEqual([{ seat: 3, difficulty: 'hard', risk: 'high' }]);
      expect(plan.skipped).toBe(1);
    });

    it('treats the seats of replaced computers as free and clears them', () => {
      const seats = [human, computer(), computer(), open];
      const plan = planComputers(seats, [{ seat: 3, difficulty: 'hard', risk: 'high' }]);
      expect(plan.clear).toEqual([1, 2]);
      expect(plan.place).toEqual([{ seat: 3, difficulty: 'hard', risk: 'high' }]);
    });

    it('never uses the host seat', () => {
      const seats = [human, open];
      expect(planComputers(seats, [{ seat: 0, difficulty: 'easy', risk: 'none' }]).place).toEqual([
        { seat: 1, difficulty: 'easy', risk: 'none' },
      ]);
    });

    it('does not use reserved seats', () => {
      const seats: SeatView[] = [human, { state: 'reserved', nickname: 'Cy' }, open];
      expect(planComputers(seats, [{ seat: 1, difficulty: 'easy', risk: 'none' }]).place).toEqual([
        { seat: 2, difficulty: 'easy', risk: 'none' },
      ]);
    });
  });
});
