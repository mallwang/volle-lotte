import { hasScoringDie, scoreDice } from './scoring.js';
import type {
  Action,
  CardType,
  Event,
  RandomInt,
  Rejection,
  RejectionReason,
  Rules,
  Turn,
} from './types.js';

/** Effects that need the player list, applied by the game layer. */
export type Effect = 'plusMinus' | 'cloverWin';

export type StepResult =
  | {
      readonly ok: true;
      readonly turn: Turn | null;
      readonly credit: number;
      readonly events: Event[];
      readonly effect?: Effect;
    }
  | Rejection;

const STREET_POINTS = 2000;

export function newTurn(): Turn {
  return {
    phase: 'draw',
    card: null,
    dice: [],
    free: 0,
    carried: 0,
    run: 0,
    street: [],
    volleLottes: 0,
  };
}

const reject = (reason: RejectionReason): Rejection => ({ ok: false, reason });

const isBonus = (card: CardType | null) => card?.startsWith('bonus') === true;

/** A card is drawn: Stop credits what was carried, everything else starts a run with six dice. */
export function applyCard(turn: Turn, card: CardType): Extract<StepResult, { ok: true }> {
  const events: Event[] = [{ type: 'cardDrawn', card }];
  if (card === 'stop') {
    if (turn.carried > 0) events.push({ type: 'banked', points: turn.carried });
    return { ok: true, turn: null, credit: turn.carried, events };
  }
  return {
    ok: true,
    turn: { ...turn, phase: 'throw', card, dice: [], free: 6, run: 0, street: [], volleLottes: 0 },
    credit: 0,
    events,
  };
}

function end(credit: number, events: Event[], effect?: Effect): Extract<StepResult, { ok: true }> {
  if (credit > 0) events.push({ type: 'banked', points: credit });
  return { ok: true, turn: null, credit, events, ...(effect && { effect }) };
}

function resolveVolleLotte(
  rules: Rules,
  turn: Turn,
  events: Event[],
): Extract<StepResult, { ok: true }> {
  events.push({ type: 'volleLotte' });
  const total = turn.carried + turn.run;
  switch (turn.card) {
    case 'doubleLotte': {
      const doubled = turn.run * 2;
      if (doubled < rules.minimumPoints) {
        events.push({ type: 'turnLost', lost: total });
        return { ok: true, turn: null, credit: 0, events };
      }
      return end(turn.carried + doubled, events);
    }
    case 'fireworks':
      return end(total, events);
    case 'street':
      return end(STREET_POINTS, events);
    case 'plusMinus':
      return end(0, events, 'plusMinus');
    case 'clover':
      if (turn.volleLottes + 1 === 2) return end(0, events, 'cloverWin');
      return {
        ok: true,
        turn: { ...turn, phase: 'throw', dice: [], free: 6, volleLottes: 1 },
        credit: 0,
        events,
      };
    default: // bonus: add the bonus, then bank or draw the next card
      return {
        ok: true,
        turn: { ...turn, phase: 'decide', dice: [], run: turn.run + Number(turn.card?.slice(5)) },
        credit: 0,
        events,
      };
  }
}

function bust(turn: Turn, events: Event[]): Extract<StepResult, { ok: true }> {
  const lost = turn.carried + turn.run;
  if (turn.card === 'fireworks') {
    events.push({ type: 'bust', lost: 0 });
    return end(lost, events);
  }
  events.push({ type: 'bust', lost });
  return { ok: true, turn: null, credit: 0, events };
}

/** Whether `bank` may ever be used on this card in the current state (a Volle Lotte is required instead). */
function bankForbidden(turn: Turn): boolean {
  const { card } = turn;
  return (
    card === 'fireworks' ||
    card === 'street' ||
    (turn.carried > 0 && (card === 'doubleLotte' || card === 'clover'))
  );
}

function throwAction(turn: Turn, rng: RandomInt): StepResult {
  if (!(turn.phase === 'throw' || (turn.phase === 'decide' && turn.free > 0)))
    return reject('wrongPhase');
  const dice = Array.from({ length: turn.free }, () => rng(6) + 1);
  const events: Event[] = [{ type: 'thrown', dice }];
  const dead =
    turn.card === 'street' ? dice.every((v) => turn.street.includes(v)) : !hasScoringDie(dice);
  return dead
    ? bust(turn, events)
    : { ok: true, turn: { ...turn, phase: 'select', dice }, credit: 0, events };
}

function selectAction(
  rules: Rules,
  turn: Turn,
  action: Extract<Action, { type: 'select' }>,
): StepResult {
  if (turn.phase !== 'select') return reject('wrongPhase');
  const picks = action.dice;
  if (picks.length === 0) return reject('emptySelection');
  if (picks.some((i) => !Number.isInteger(i) || i < 0 || i >= turn.dice.length))
    return reject('invalidIndex');
  if (new Set(picks).size !== picks.length) return reject('duplicateIndex');
  const values = picks.map((i) => turn.dice[i]);
  let points = 0;
  if (turn.card === 'street') {
    // one die per still-missing value
    if (new Set(values).size !== values.length || values.some((v) => turn.street.includes(v)))
      return reject('nonScoringDie');
  } else {
    points = scoreDice(values, rules);
    if (points < 0) return reject('nonScoringDie');
  }
  const next: Turn = {
    ...turn,
    dice: [],
    run: turn.run + points,
    free: turn.free - values.length,
    street: [...turn.street, ...(turn.card === 'street' ? values : [])].sort((a, b) => a - b),
  };
  const events: Event[] = [{ type: 'selected', dice: values, points }];
  return next.free > 0
    ? { ok: true, turn: { ...next, phase: 'decide' }, credit: 0, events }
    : resolveVolleLotte(rules, next, events);
}

function bankAction(rules: Rules, turn: Turn): StepResult {
  if (turn.phase !== 'throw' && turn.phase !== 'decide') return reject('wrongPhase');
  if (bankForbidden(turn)) return reject('wrongPhase');
  if (turn.run === 0) return reject('nothingToBank');
  if (turn.run < rules.minimumPoints) return reject('belowMinimum');
  return end(turn.carried + turn.run, []);
}

function drawAction(turn: Turn): StepResult {
  // only after a Volle Lotte on a Bonus card: keep the points and draw the next card
  if (turn.phase !== 'decide' || turn.free > 0 || !isBonus(turn.card)) return reject('wrongPhase');
  return {
    ok: true,
    turn: { ...newTurn(), carried: turn.carried + turn.run },
    credit: 0,
    events: [],
  };
}

/** One action inside a turn (phases throw, select, decide); drawing cards is up to the game layer. */
export function step(rules: Rules, turn: Turn, action: Action, rng: RandomInt): StepResult {
  switch (action.type) {
    case 'throw':
      return throwAction(turn, rng);
    case 'select':
      return selectAction(rules, turn, action);
    case 'bank':
      return bankAction(rules, turn);
    case 'draw':
      return drawAction(turn);
  }
}
