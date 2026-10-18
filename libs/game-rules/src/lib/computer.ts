import { legalActions } from './game.js';
import { chooseBankOrDraw, chooseBankOrThrow } from './computer/decide.js';
import type { Select } from './computer/easy.js';
import { resolve } from './computer/profile.js';
import type { Profile } from './computer/profile.js';
import { chooseSelect } from './computer/select.js';
import { kappaFor, reachesTarget } from './computer/situation.js';
import type { Action, GameState, RandomInt } from './types.js';

export { DEFAULT_PROFILE, resolve } from './computer/profile.js';
export { warmUp } from './computer/warm.js';
export type { ConcreteRisk, Profile, Skill } from './computer/profile.js';

function choose(state: GameState, profile: Profile, rng: RandomInt, legal: Action[]): Action {
  const turn = state.turn;
  if (!turn || legal.length === 1) return legal[0];
  const { skill, risk } = resolve(profile, rng);
  const kappa = kappaFor(state, risk);
  const find = <T extends Action['type']>(type: T) =>
    legal.find((a): a is Extract<Action, { type: T }> => a.type === type);
  const bank = find('bank');
  if (bank && reachesTarget(state, turn.carried + turn.run)) return bank;
  const selects = legal.filter((a): a is Select => a.type === 'select');
  if (selects.length > 0) return chooseSelect(state, selects, skill, kappa, rng);
  const draw = find('draw');
  const again = find('throw');
  if (bank && draw) return chooseBankOrDraw(state, bank, draw, skill, risk, kappa, rng);
  if (bank && again) return chooseBankOrThrow(state, bank, again, skill, risk, kappa, rng);
  return again ?? draw ?? bank ?? legal[0];
}

/**
 * Next action of a computer player; always one of `legalActions(state)`. Throws when the game is over.
 * `random` skill and risk of the profile are resolved anew on every call.
 */
export function chooseAction(state: GameState, profile: Profile, rng: RandomInt): Action {
  const legal = legalActions(state);
  if (legal.length === 0) throw new Error('no legal action');
  const action = choose(state, profile, rng, legal);
  return legal.includes(action) ? action : legal[0];
}
