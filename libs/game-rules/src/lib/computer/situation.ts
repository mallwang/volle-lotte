import type { GameState } from '../types.js';
import { DEFICIT_GAIN, NEAR_TARGET_FROM, NEAR_TARGET_GAIN, RISK_KAPPA } from './constants.js';
import type { ConcreteRisk } from './profile.js';

/** kappa shift from the score situation: negative (more risk) when behind the leader, positive close to the target. */
export function situationShift(state: GameState): number {
  const { targetScore } = state.rules;
  const mine = state.players[state.current]?.score ?? 0;
  const leader = Math.max(
    0,
    ...state.players.filter((_, i) => i !== state.current).map((p) => p.score),
  );
  const deficit = Math.min(1, Math.max(0, leader - mine) / targetScore);
  const near = Math.max(0, mine / targetScore - NEAR_TARGET_FROM) / (1 - NEAR_TARGET_FROM);
  return -DEFICIT_GAIN * deficit + NEAR_TARGET_GAIN * Math.min(1, near);
}

/** Loss weight for this decision: the risk's base plus the score situation. */
export const kappaFor = (state: GameState, risk: ConcreteRisk): number =>
  RISK_KAPPA[risk] + situationShift(state);

/** Whether banking `points` now reaches the target score. */
export const reachesTarget = (state: GameState, points: number): boolean =>
  (state.players[state.current]?.score ?? 0) + points >= state.rules.targetScore;
