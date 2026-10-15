# Data Model: Rules Engine

All types are plain readonly data (numbers, strings, booleans, arrays, plain objects). Defined in `libs/game-rules/src/lib/types.ts`.

## Rules

| Field                 | Type                       | Default | Validation                    |
| --------------------- | -------------------------- | ------- | ----------------------------- |
| `targetScore`         | integer                    | 6000    | > 0                           |
| `minimumPoints`       | integer                    | 350     | >= 0 (0 = off)                |
| `fourOfAKindDoubling` | boolean                    | true    |                               |
| `cardCounts`          | `Record<CardType, number>` | 56 set  | each integer >= 0, total >= 1 |

Default `cardCounts`: `bonus200..bonus600` 5 each, `doubleLotte` 5, `stop` 10, `star` 5, `street` 5, `plusMinus` 5, `clover` 1.

## CardType

`bonus200 | bonus300 | bonus400 | bonus500 | bonus600 | doubleLotte | stop | star | street | plusMinus | clover`

## Player

`{ name: string, score: number }`. Score is an integer >= 0. 2-8 players; names are display only (no identity).

## Turn

Exists only while a game is running. A turn is one player's go, spanning one or more drawn cards.

| Field         | Type                                | Meaning                                                                      |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| `phase`       | `draw \| throw \| select \| decide` | which action is allowed next                                                 |
| `card`        | `CardType \| null`                  | current card (null in `draw`)                                                |
| `dice`        | `number[]`                          | values (1-6) of the latest throw, only in `select`; length = free dice       |
| `free`        | integer 1-6                         | dice not yet set aside in the current run                                    |
| `carried`     | integer >= 0                        | points of earlier cards in this turn (survive a Volle Lotte, lost on a bust) |
| `run`         | integer >= 0                        | points collected since the current card was drawn                            |
| `street`      | `number[]`                          | Street only: values 1-6 already collected, ascending                         |
| `volleLottes` | integer >= 0                        | Clover only: new Volle Lotte since the Clover was drawn                      |

Turn points are `carried + run`. `volleLottes` counts only Volle Lotte scored after the Clover card was drawn.

## GameState

| Field     | Type             | Notes                                |
| --------- | ---------------- | ------------------------------------ |
| `version` | `1`              | schema version for `fromJSON`        |
| `rules`   | `Rules`          |                                      |
| `players` | `Player[]`       | 2-8                                  |
| `current` | integer          | index of the player whose turn it is |
| `deck`    | `CardType[]`     | draw pile, top = last element        |
| `turn`    | `Turn \| null`   | null when the game is over           |
| `result`  | `Result \| null` | set when the game is over            |

`Result = { reason: 'targetScore' | 'clover', winner: number, ranking: { rank: number, players: number[] }[] }`. Ties share a rank (`players` holds all indices with that score). With `clover` the winner is rank 1 regardless of score; the others are ranked by score after it.

## Action

`{ type: 'draw' } | { type: 'select', dice: number[] } | { type: 'throw' } | { type: 'bank' }`

`select.dice` are indexes into `turn.dice`. Actions have no player field: they always act for `current`.

## Rejection

`{ ok: false, reason }` where `reason` is one of: `gameOver`, `wrongPhase`, `emptySelection`, `invalidIndex`, `duplicateIndex`, `nonScoringDie`, `belowMinimum`, `nothingToBank`.

## Event

Returned with every accepted action for UI and logs: `{ type: 'cardDrawn', card } | { type: 'thrown', dice } | { type: 'selected', dice, points } | { type: 'volleLotte' } | { type: 'bust', lost } | { type: 'banked', points } | { type: 'turnLost', lost } | { type: 'turnEnded', next } | { type: 'deckReshuffled' } | { type: 'penalty', player, lost } | { type: 'gameOver', result }`.

## State transitions

```text
draw ──draw──▶ card effect
   Stop            ─▶ credit carried (if any), turn ends
   Bonus/Double/Street/Star/Clover/PlusMinus ─▶ throw (free = 6, run = 0)
throw ──throw──▶ select   (a throw without a scoring die, or Street without a missing value, is a bust: turn ends, 0 points)
select ──select──▶ run += points, free -= selected
   free > 0  ─▶ decide
   free = 0  ─▶ Volle Lotte, resolved by card
decide ──throw──▶ select | ──bank──▶ credit carried+run, turn ends (needs run >= minimum)
```

`bank` is rejected with `belowMinimum` if `run < minimumPoints`. In `decide`, Star has only `throw` (never `bank`); a bust there credits all turn points.

### Volle Lotte by card

| Card         | Result                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Bonus        | `run += bonus`, phase `decide` (`bank` or `draw`; `draw` moves `run` into `carried`)                   |
| Double Lotte | `run *= 2` (must reach the minimum, else the turn is lost), credit `carried + run`, turn ends          |
| Star         | credit `carried + run`, turn ends                                                                      |
| Street       | success when all six values are collected: credit 2000 (`carried` is discarded), turn ends             |
| Plus/Minus   | player gets +1,000 (turn points discarded), leaders lose 1,000, turn ends                              |
| Clover       | `volleLottes += 1`, on 2 the game ends; otherwise 6 fresh dice (`free = 6`, `run` kept), phase `throw` |

Street note: a successful Street credits exactly 2,000 regardless of `carried` (earlier turn points are replaced, not added), so drawing a Street with a high score is a real gamble: a bust loses everything. One test pins the behaviour (2,300 held, Street succeeds, 2,000 credited).

After a Volle Lotte on a Bonus card followed by `draw`, a next Bonus card needs `run >= minimumPoints` for that card before `bank`, else the turn is lost; a next Street, Double Lotte or Clover must succeed, else everything is lost. A Stop drawn there credits `carried`.

## Validation on restore (`fromJSON`)

- `version === 1`, all fields present with the types above.
- 2-8 players, scores integers >= 0, `current` in range.
- Every deck entry is a known `CardType`.
- `turn` and `result` are mutually exclusive; `turn.dice` has `free` entries only in `select`; `street` values unique in 1-6; phase and `card` consistent (`card` null only in `draw`).
- Any violation returns `{ ok: false, reason }`; no partial state is returned.
