import type { Difficulty, Risk } from '../protocol.js';
import type { RandomInt } from '../types.js';

export type Skill = 'easy' | 'medium' | 'hard';
export type ConcreteRisk = 'none' | 'medium' | 'high';

/** Skill and risk of one computer seat; each is a concrete value or `random`. */
export interface Profile {
  readonly difficulty: Difficulty;
  readonly risk: Risk;
}

export const DEFAULT_PROFILE: Profile = { difficulty: 'medium', risk: 'medium' };

const SKILLS: readonly Skill[] = ['easy', 'medium', 'hard'];
const RISKS: readonly ConcreteRisk[] = ['none', 'medium', 'high'];

/** Concrete skill and risk for one decision: `random` is drawn anew (skill first, then risk). */
export function resolve(profile: Profile, rng: RandomInt): { skill: Skill; risk: ConcreteRisk } {
  const skill = profile.difficulty === 'random' ? SKILLS[rng(3)] : profile.difficulty;
  const risk = profile.risk === 'random' ? RISKS[rng(3)] : profile.risk;
  return { skill, risk };
}
