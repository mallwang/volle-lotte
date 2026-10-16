import { buildDeck, drawCard } from './cards.js';
import { seededRandomInt } from './rng.js';
import { applyCard, newTurn, step } from './turn.js';
import type { Action, Event, GameState, Outcome, Rank, RandomInt, Result, Rules } from './types.js';
import { rulesError } from './types.js';

const PLUS_MINUS = 1000;

/** Standings by score, descending; ties share a rank (1, 1, 3). `first` is forced to rank 1 (Clover winner). */
export function ranking(state: Pick<GameState, 'players'>, first?: number): Rank[] {
  const { players } = state;
  const order = players.map((_, i) => i).filter((i) => i !== first);
  order.sort((a, b) => players[b].score - players[a].score);
  const offset = first === undefined ? 0 : 1;
  const ranks: Rank[] = first === undefined ? [] : [{ rank: 1, players: [first] }];
  order.forEach((i, n) => {
    const last = ranks.at(-1);
    if (last && n > 0 && players[last.players[0]].score === players[i].score) {
      ranks[ranks.length - 1] = { rank: last.rank, players: [...last.players, i] };
    } else {
      ranks.push({ rank: offset + n + 1, players: [i] });
    }
  });
  return ranks;
}

export function createGame(names: readonly string[], rules: Rules, rng: RandomInt): GameState {
  if (names.length < 2 || names.length > 8) throw new RangeError('2 to 8 players required');
  const error = rulesError(rules);
  if (error) throw new RangeError(error);
  return {
    version: 1,
    rules,
    players: names.map((name) => ({ name, score: 0 })),
    current: 0,
    deck: buildDeck(rules, rng),
    turn: newTurn(),
    result: null,
  };
}

export function applyAction(state: GameState, action: Action, rng: RandomInt): Outcome {
  const { rules } = state;
  if (state.result || !state.turn) return { ok: false, reason: 'gameOver' };
  const events: Event[] = [];
  let deck = state.deck;
  let r;
  if (state.turn.phase === 'draw') {
    if (action.type !== 'draw') return { ok: false, reason: 'wrongPhase' };
    r = { ok: true as const, turn: state.turn, credit: 0, events: [] as Event[] };
  } else {
    const stepped = step(rules, state.turn, action, rng);
    if (!stepped.ok) return stepped;
    r = stepped;
  }
  events.push(...r.events);
  let { turn } = r;
  // a Bonus Volle Lotte followed by `draw` (or a fresh turn) draws the next card at once
  const { effect } = r;
  let credit = r.credit;
  if (turn?.phase === 'draw') {
    const drawn = drawCard(deck, rules, rng);
    deck = drawn.deck;
    if (drawn.reshuffled) events.push({ type: 'deckReshuffled' });
    const applied = applyCard(turn, drawn.card);
    events.push(...applied.events);
    ({ turn, credit } = applied);
  }

  const players = state.players.map((p) => ({ ...p }));
  const me = state.current;
  if (effect === 'plusMinus') {
    const top = Math.max(...players.map((p) => p.score));
    players.forEach((p, i) => {
      if (p.score === top && i !== me) {
        const lost = Math.min(p.score, PLUS_MINUS);
        p.score -= lost;
        if (lost > 0) events.push({ type: 'penalty', player: i, lost });
      }
    });
    credit = PLUS_MINUS;
  }
  players[me].score += credit;

  const next = { ...state, players, deck };
  let result: Result | null = null;
  if (effect === 'cloverWin') {
    result = { reason: 'clover', winner: me, ranking: ranking(next, me) };
  } else if (players[me].score >= rules.targetScore) {
    result = { reason: 'targetScore', winner: me, ranking: ranking(next) };
  }
  if (result) {
    events.push({ type: 'gameOver', result });
    return { ok: true, state: { ...next, turn: null, result }, events };
  }
  if (turn) return { ok: true, state: { ...next, turn }, events };
  const current = (me + 1) % players.length;
  events.push({ type: 'turnEnded', next: current });
  return { ok: true, state: { ...next, current, turn: newTurn() }, events };
}

/** Every action `applyAction` accepts now; probed with a throw-away seeded rng. */
export function legalActions(state: GameState): Action[] {
  const turn = state.turn;
  if (state.result || !turn) return [];
  // ponytail: probes the turn reducer directly; `draw` is legal in phase draw, otherwise step decides
  const probe = (a: Action) =>
    turn.phase === 'draw' ? a.type === 'draw' : step(state.rules, turn, a, seededRandomInt(0)).ok;
  const actions: Action[] = [{ type: 'draw' }, { type: 'throw' }, { type: 'bank' }];
  const n = turn.phase === 'select' ? turn.dice.length : 0;
  for (let mask = 1; mask < 1 << n; mask++) {
    actions.push({
      type: 'select',
      dice: turn.dice.map((_, i) => i).filter((i) => mask & (1 << i)),
    });
  }
  return actions.filter(probe);
}

/** Next player's fresh turn, scores unchanged (turn timeout while selecting). */
export function skipTurn(state: GameState): GameState {
  if (state.result || !state.turn) return state;
  return { ...state, current: (state.current + 1) % state.players.length, turn: newTurn() };
}
