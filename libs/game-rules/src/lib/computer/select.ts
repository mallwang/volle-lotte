import { scoreDice } from '../scoring.js';
import type { CardType, GameState, RandomInt } from '../types.js';
import { averageBonus } from './cards.js';
import {
  CARRIED_CAP,
  MEDIUM_BEST_CHANCE,
  MEDIUM_MAX_REGRET,
  MEDIUM_SLIP,
  MEDIUM_TEMPERATURE,
} from './constants.js';
import { easySelect, pickBy } from './easy.js';
import type { Select } from './easy.js';
import type { Skill } from './profile.js';
import { tableFor } from './value.js';

/** Cards on which every computer sets aside all dice it can. */
const ALL_DICE_CARDS: ReadonlySet<CardType> = new Set<CardType>([
  'street',
  'doubleLotte',
  'plusMinus',
  'clover',
  'star',
]);

/** Draws an index with probability proportional to exp(value / temperature). */
export function softmaxIndex(
  values: readonly number[],
  temperature: number,
  rng: RandomInt,
): number {
  const top = Math.max(...values);
  const weights = values.map((v) => Math.exp((v - top) / temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  let u = (rng(1_000_000) / 1_000_000) * total;
  for (let i = 0; i < weights.length; i++) {
    u -= weights[i];
    if (u < 0) return i;
  }
  return weights.length - 1;
}

/** Medium varies between close choices, but excludes clearly inferior moves. */
export function mediumIndex(values: readonly number[], rng: RandomInt): number {
  if (rng(1000) < MEDIUM_BEST_CHANCE * 1000) return argmaxIndex(values, rng);
  const best = Math.max(...values);
  return softmaxIndex(
    values.map((v) => (best - v <= MEDIUM_MAX_REGRET ? v : -Infinity)),
    MEDIUM_TEMPERATURE,
    rng,
  );
}

/** Index of the highest value; exact ties are broken by `rng`. */
export function argmaxIndex(values: readonly number[], rng: RandomInt): number {
  const best = Math.max(...values);
  const ties = values.map((v, i) => (v >= best - 1e-9 ? i : -1)).filter((i) => i >= 0);
  return ties[rng(ties.length)];
}

/** Selection on a special card: the most dice, then (skill permitting) the most points. */
function chooseAllDice(
  picks: readonly Select[],
  points: (a: Select) => number,
  skill: Skill,
  rng: RandomInt,
): Select {
  const most = Math.max(...picks.map((a) => a.dice.length));
  const all = picks.filter((a) => a.dice.length === most);
  if (skill === 'easy' || (skill === 'medium' && rng(1000) < MEDIUM_SLIP * 1000)) {
    return all[rng(all.length)];
  }
  return pickBy(all, (a) => -points(a), rng);
}

/** Which dice to set aside, among the legal selections. */
export function chooseSelect(
  state: GameState,
  legal: readonly Select[],
  skill: Skill,
  kappa: number,
  rng: RandomInt,
): Select {
  const turn = state.turn;
  if (!turn?.card) return legal[0];
  const points = (a: Select) =>
    Math.max(
      0,
      scoreDice(
        a.dice.map((i) => turn.dice[i]),
        state.rules,
      ),
    );
  if (ALL_DICE_CARDS.has(turn.card)) return chooseAllDice(legal, points, skill, rng);
  if (skill === 'easy') return easySelect(legal, points, rng);
  // Equal faces create many equivalent index subsets; they must not bias Medium's probabilities.
  const candidates =
    skill === 'medium'
      ? [...new Map(legal.map((a) => [`${points(a)}/${a.dice.length}`, a])).values()]
      : legal;
  const table = tableFor(
    state.rules,
    'bonus',
    Math.min(turn.carried, CARRIED_CAP),
    Number(turn.card.slice(5)) || averageBonus(state.rules.cardCounts),
    kappa,
  );
  const values = candidates.map((a) =>
    table.afterPick(turn.free, turn.run, { points: points(a), dice: a.dice.length }),
  );
  const i = skill === 'hard' ? argmaxIndex(values, rng) : mediumIndex(values, rng);
  return candidates[i];
}
