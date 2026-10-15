export const CARD_TYPES = [
  'bonus200',
  'bonus300',
  'bonus400',
  'bonus500',
  'bonus600',
  'doubleLotte',
  'stop',
  'fireworks',
  'street',
  'plusMinus',
  'clover',
] as const;

export type CardType = (typeof CARD_TYPES)[number];

/** Returns an integer in [0, maxExclusive). */
export type RandomInt = (maxExclusive: number) => number;

export interface Rules {
  readonly targetScore: number;
  readonly minimumPoints: number;
  readonly fourOfAKindDoubling: boolean;
  readonly cardCounts: Readonly<Record<CardType, number>>;
}

export interface Player {
  readonly name: string;
  readonly score: number;
}

export type Phase = 'draw' | 'throw' | 'select' | 'decide';

export interface Turn {
  readonly phase: Phase;
  readonly card: CardType | null;
  /** Latest throw, only filled in phase `select`. */
  readonly dice: readonly number[];
  /** Dice not yet set aside in the current run. */
  readonly free: number;
  /** Points of earlier cards in this turn. */
  readonly carried: number;
  /** Points collected since the current card was drawn. */
  readonly run: number;
  /** Street only: collected values, ascending. */
  readonly street: readonly number[];
  /** Clover only: new Volle Lotte since the card was drawn. */
  readonly volleLottes: number;
}

export interface Rank {
  readonly rank: number;
  readonly players: readonly number[];
}

export interface Result {
  readonly reason: 'targetScore' | 'clover';
  readonly winner: number;
  readonly ranking: readonly Rank[];
}

export interface GameState {
  readonly version: 1;
  readonly rules: Rules;
  readonly players: readonly Player[];
  readonly current: number;
  /** Draw pile, top = last element. */
  readonly deck: readonly CardType[];
  readonly turn: Turn | null;
  readonly result: Result | null;
}

export type Action =
  | { readonly type: 'draw' }
  | { readonly type: 'select'; readonly dice: readonly number[] }
  | { readonly type: 'throw' }
  | { readonly type: 'bank' };

export type RejectionReason =
  | 'gameOver'
  | 'wrongPhase'
  | 'emptySelection'
  | 'invalidIndex'
  | 'duplicateIndex'
  | 'nonScoringDie'
  | 'belowMinimum'
  | 'nothingToBank';

export interface Rejection {
  readonly ok: false;
  readonly reason: RejectionReason;
}

export type Event =
  | { readonly type: 'cardDrawn'; readonly card: CardType }
  | { readonly type: 'thrown'; readonly dice: readonly number[] }
  | { readonly type: 'selected'; readonly dice: readonly number[]; readonly points: number }
  | { readonly type: 'volleLotte' }
  | { readonly type: 'bust'; readonly lost: number }
  | { readonly type: 'banked'; readonly points: number }
  | { readonly type: 'turnLost'; readonly lost: number }
  | { readonly type: 'turnEnded'; readonly next: number }
  | { readonly type: 'deckReshuffled' }
  | { readonly type: 'penalty'; readonly player: number; readonly lost: number }
  | { readonly type: 'gameOver'; readonly result: Result };

export type Outcome =
  { readonly ok: true; readonly state: GameState; readonly events: readonly Event[] } | Rejection;

export function defaultRules(): Rules {
  return {
    targetScore: 6000,
    minimumPoints: 350,
    fourOfAKindDoubling: true,
    cardCounts: {
      bonus200: 5,
      bonus300: 5,
      bonus400: 5,
      bonus500: 5,
      bonus600: 5,
      doubleLotte: 5,
      stop: 10,
      fireworks: 5,
      street: 5,
      plusMinus: 5,
      clover: 1,
    },
  };
}

/** First problem found in `rules` (also for untyped input), or null if they are valid. */
export function rulesError(rules: unknown): string | null {
  if (typeof rules !== 'object' || rules === null) return 'rules must be an object';
  const { targetScore, minimumPoints, fourOfAKindDoubling, cardCounts } = rules as Record<
    string,
    unknown
  >;
  if (!Number.isInteger(targetScore) || (targetScore as number) <= 0)
    return 'targetScore must be a positive integer';
  if (!Number.isInteger(minimumPoints) || (minimumPoints as number) < 0)
    return 'minimumPoints must be an integer >= 0';
  if (typeof fourOfAKindDoubling !== 'boolean') return 'fourOfAKindDoubling must be a boolean';
  if (typeof cardCounts !== 'object' || cardCounts === null) return 'cardCounts must be an object';
  const counts = CARD_TYPES.map((c) => (cardCounts as Record<string, unknown>)[c]);
  if (!counts.every((n) => Number.isInteger(n) && (n as number) >= 0))
    return 'card counts must be integers >= 0';
  if (counts.reduce((sum: number, n) => sum + (n as number), 0) < 1)
    return 'the deck needs at least one card';
  return null;
}
