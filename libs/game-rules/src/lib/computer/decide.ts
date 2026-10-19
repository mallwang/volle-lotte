import type { Action, GameState, RandomInt } from '../types.js';
import { drawValue } from './cards.js';
import { CARRIED_CAP, DRAW_SCALE_BASE, DRAW_SCALE_FRACTION, HIGH_DRAW_BIAS } from './constants.js';
import { easyBank, easyDraw } from './easy.js';
import type { ConcreteRisk, Skill } from './profile.js';
import { argmaxIndex, mediumIndex } from './select.js';
import { tableFor } from './value.js';

type Kind<T extends Action['type']> = Extract<Action, { type: T }>;

/** Bank or throw again in the middle of a run (`free` > 0). */
export function chooseBankOrThrow(
  state: GameState,
  bank: Kind<'bank'>,
  again: Kind<'throw'>,
  skill: Skill,
  risk: ConcreteRisk,
  kappa: number,
  rng: RandomInt,
): Action {
  const turn = state.turn;
  if (!turn) return again;
  if (skill === 'easy') return easyBank(state, risk) ? bank : again;
  if (turn.carried > CARRIED_CAP) return bank;
  const mode = turn.card === 'doubleLotte' ? 'double' : 'bonus';
  const table = tableFor(
    state.rules,
    mode,
    turn.carried,
    mode === 'bonus' ? Number(turn.card?.slice(5)) : 0,
    kappa,
  );
  const values = [table.bank(turn.run), table.throwValue(turn.free, turn.run)];
  const i = skill === 'hard' ? argmaxIndex(values, rng) : mediumIndex(values, rng);
  return i === 0 ? bank : again;
}

/** Probability to draw rather than bank after a Volle Lotte on a Bonus card (`stake` points at risk). */
export function drawProbability(
  state: GameState,
  stake: number,
  risk: ConcreteRisk,
  kappa: number,
): number {
  if (risk === 'none') return 0;
  const advantage = drawValue(state, stake, kappa) - stake + (risk === 'high' ? HIGH_DRAW_BIAS : 0);
  const scale = DRAW_SCALE_BASE + DRAW_SCALE_FRACTION * stake;
  return 1 / (1 + Math.exp(-advantage / scale));
}

/** Bank or draw the next card after a Volle Lotte on a Bonus card. */
export function chooseBankOrDraw(
  state: GameState,
  bank: Kind<'bank'>,
  draw: Kind<'draw'>,
  skill: Skill,
  risk: ConcreteRisk,
  kappa: number,
  rng: RandomInt,
): Action {
  const turn = state.turn;
  if (!turn || risk === 'none') return bank;
  if (skill === 'easy') return easyDraw(state, risk) ? draw : bank;
  const stake = turn.carried + turn.run;
  if (stake > CARRIED_CAP) return bank;
  return rng(1_000_000) / 1_000_000 < drawProbability(state, stake, risk, kappa) ? draw : bank;
}
