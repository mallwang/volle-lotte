import { chooseAction } from '../computer.js';
import type { Profile } from '../computer.js';
import { applyAction, createGame, legalActions } from '../game.js';
import { seededRandomInt } from '../rng.js';
import { defaultRules } from '../types.js';
import type { Action, CardType, Rules } from '../types.js';
import { resolve } from './profile.js';
import { situation } from './testing.js';

const SPECIAL: CardType[] = ['street', 'doubleLotte', 'plusMinus', 'clover', 'star'];
const SKILLS = ['easy', 'medium', 'hard', 'random'] as const;
const RISKS = ['none', 'medium', 'high', 'random'] as const;
const combos: Profile[] = SKILLS.flatMap((difficulty) =>
  RISKS.map((risk) => ({ difficulty, risk })),
);

function randomRules(rng: (n: number) => number): Rules {
  const counts = defaultRules().cardCounts;
  const pick = (n: number) => (rng(3) === 0 ? 0 : rng(n));
  return {
    targetScore: 1000 + 500 * rng(4),
    minimumPoints: [0, 350, 1000, 2500][rng(4)],
    fourOfAKindDoubling: rng(2) === 0,
    cardCounts: {
      ...counts,
      stop: pick(20),
      bonus200: pick(6),
      bonus400: 1 + rng(4),
      star: pick(6),
      street: pick(6),
      plusMinus: pick(6),
      doubleLotte: pick(6),
      clover: pick(2),
    },
  };
}

type Select = Extract<Action, { type: 'select' }>;
const isSelect = (a: Action): a is Select => a.type === 'select';

/** Plays one game; checks legality and the all-dice rule on every decision; returns the number of special-card selections. */
function playChecked(profile: Profile, seed: number): number {
  const rng = seededRandomInt(seed);
  let state = createGame(['a', 'b', 'c'].slice(0, 2 + rng(2)), randomRules(rng), rng);
  let special = 0;
  for (let i = 0; i < 50_000 && !state.result; i++) {
    const legal = legalActions(state);
    const action = chooseAction(state, profile, rng);
    expect(legal).toContainEqual(action);
    const card = state.turn?.card;
    if (isSelect(action) && card && SPECIAL.includes(card)) {
      expect(action.dice).toHaveLength(
        Math.max(...legal.filter(isSelect).map((a) => a.dice.length)),
      );
      special++;
    }
    const out = applyAction(state, action, rng);
    if (!out.ok) throw new Error(out.reason);
    state = out.state;
  }
  expect(state.result).not.toBeNull();
  return special;
}

describe('every skill and risk', () => {
  it('only plays legal actions, always sets aside all dice on special cards, and every game ends', () => {
    let special = 0;
    for (const [c, profile] of combos.entries()) {
      for (let g = 0; g < 4; g++) special += playChecked(profile, c * 100 + g + 1);
    }
    expect(special).toBeGreaterThan(100);
  }, 120_000);

  it('takes one die of every still-missing value on a Street', () => {
    const dice = [1, 2, 2, 4, 6, 6];
    const state = situation({
      phase: 'select',
      card: 'street',
      dice,
      free: 6,
      street: [1, 6],
      run: 0,
    });
    for (const difficulty of SKILLS) {
      const action = chooseAction(state, { difficulty, risk: 'medium' }, seededRandomInt(4));
      expect(action.type).toBe('select');
      const values = (action as Select).dice.map((i) => dice[i]);
      expect(values.sort()).toEqual([2, 4]);
    }
  });

  it('is deterministic for a seed over a whole game', () => {
    const play = () => {
      const rng = seededRandomInt(99);
      let state = createGame(['a', 'b'], defaultRules(), rng);
      const log: Action[] = [];
      for (let i = 0; i < 50_000 && !state.result; i++) {
        const action = chooseAction(state, { difficulty: 'random', risk: 'random' }, rng);
        log.push(action);
        const out = applyAction(state, action, rng);
        if (!out.ok) throw new Error(out.reason);
        state = out.state;
      }
      return log;
    };
    expect(play()).toEqual(play());
  });
});

describe('random skill and risk', () => {
  const draws = 3000;

  it('show every concrete value in 30-37 % of the decisions, independently', () => {
    const rng = seededRandomInt(8);
    const skills = { easy: 0, medium: 0, hard: 0 };
    const risks = { none: 0, medium: 0, high: 0 };
    const joint = new Map<string, number>();
    for (let i = 0; i < draws; i++) {
      const r = resolve({ difficulty: 'random', risk: 'random' }, rng);
      skills[r.skill]++;
      risks[r.risk]++;
      joint.set(`${r.skill}/${r.risk}`, (joint.get(`${r.skill}/${r.risk}`) ?? 0) + 1);
    }
    for (const n of [...Object.values(skills), ...Object.values(risks)]) {
      expect(n / draws).toBeGreaterThan(0.3);
      expect(n / draws).toBeLessThan(0.37);
    }
    expect(joint.size).toBe(9);
    for (const n of joint.values()) expect(Math.abs(n / draws - 1 / 9)).toBeLessThan(0.03);
  });

  it('keep the other part fixed', () => {
    const rng = seededRandomInt(9);
    for (let i = 0; i < 200; i++) {
      expect(resolve({ difficulty: 'random', risk: 'medium' }, rng).risk).toBe('medium');
      expect(resolve({ difficulty: 'hard', risk: 'random' }, rng).skill).toBe('hard');
    }
  });

  it('make the actions vary in the same situation', () => {
    const state = situation({ phase: 'select', dice: [1, 5, 1, 2, 3, 6], free: 6, run: 0 });
    const rng = seededRandomInt(12);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(JSON.stringify(chooseAction(state, { difficulty: 'random', risk: 'random' }, rng)));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('draw decisions vary with a random risk', () => {
    const state = situation({ run: 700, free: 0 });
    const rng = seededRandomInt(13);
    const types = new Set<string>();
    for (let i = 0; i < 200; i++) {
      types.add(chooseAction(state, { difficulty: 'hard', risk: 'random' }, rng).type);
    }
    expect(types).toEqual(new Set(['bank', 'draw']));
  });
});
