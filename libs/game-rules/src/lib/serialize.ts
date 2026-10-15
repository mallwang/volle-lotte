import { CARD_TYPES, rulesError } from './types.js';
import type { CardType, GameState } from './types.js';

type Rec = Record<string, unknown>;
type Parsed = { ok: true; state: GameState } | { ok: false; reason: string };

const PHASES = ['draw', 'throw', 'select', 'decide'];
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min = 0): v is number => Number.isInteger(v) && (v as number) >= min;
const isDie = (v: unknown) => isInt(v, 1) && (v as number) <= 6;

export function toJSON(state: GameState): unknown {
  return JSON.parse(JSON.stringify(state));
}

function turnError(t: unknown): string | null {
  if (!isRec(t)) return 'turn must be an object';
  const { phase, card, dice, free, carried, run, street, volleLottes } = t;
  if (typeof phase !== 'string' || !PHASES.includes(phase)) return 'unknown turn phase';
  if ((card === null) !== (phase === 'draw')) return 'card must be null exactly in phase draw';
  if (card !== null && !CARD_TYPES.includes(card as CardType)) return 'unknown turn card';
  if (!isInt(free) || free > 6) return 'free must be an integer 0-6';
  if (!isInt(carried) || !isInt(run) || !isInt(volleLottes))
    return 'carried, run and volleLottes must be integers >= 0';
  if (!Array.isArray(dice) || !dice.every(isDie)) return 'dice must be values 1-6';
  if (dice.length !== (phase === 'select' ? free : 0))
    return 'dice must have `free` entries in select and none otherwise';
  if ((phase === 'throw' || phase === 'select') && free < 1)
    return 'throw and select need free dice';
  if (!Array.isArray(street) || !street.every(isDie) || new Set(street).size !== street.length)
    return 'street must hold unique values 1-6';
  return null;
}

function resultError(r: unknown, players: number): string | null {
  if (!isRec(r)) return 'result must be an object';
  if (r.reason !== 'targetScore' && r.reason !== 'clover') return 'unknown result reason';
  if (!isInt(r.winner) || r.winner >= players) return 'winner out of range';
  const ranks = r.ranking;
  const valid = (k: unknown) =>
    isRec(k) &&
    isInt(k.rank, 1) &&
    Array.isArray(k.players) &&
    k.players.every((p) => isInt(p) && p < players);
  if (!Array.isArray(ranks) || !ranks.every(valid)) return 'ranking is malformed';
  return null;
}

/** Validates everything; never throws, returns the first violation as a reason. */
export function fromJSON(data: unknown): Parsed {
  const fail = (reason: string): Parsed => ({ ok: false, reason });
  if (!isRec(data)) return fail('state must be an object');
  if (data.version !== 1) return fail('unsupported version');
  const rulesProblem = rulesError(data.rules);
  if (rulesProblem) return fail(rulesProblem);
  const { players, current, deck, turn, result } = data;
  if (!Array.isArray(players) || players.length < 2 || players.length > 8)
    return fail('2 to 8 players required');
  if (!players.every((p) => isRec(p) && typeof p.name === 'string' && isInt(p.score)))
    return fail('players need a name and an integer score >= 0');
  if (!isInt(current) || current >= players.length) return fail('current out of range');
  if (!Array.isArray(deck) || !deck.every((c) => CARD_TYPES.includes(c as CardType)))
    return fail('deck holds an unknown card');
  if ((turn === null) === (result === null))
    return fail('exactly one of turn and result must be set');
  const problem = turn === null ? resultError(result, players.length) : turnError(turn);
  if (problem) return fail(problem);
  return { ok: true, state: structuredClone(data) as unknown as GameState };
}
