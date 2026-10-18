# Data Model: Computer Player AI Rework

## Profile (per computer seat)

| Field        | Type                                       | Notes                                             |
| ------------ | ------------------------------------------ | ------------------------------------------------- |
| `difficulty` | `'easy' \| 'medium' \| 'hard' \| 'random'` | Skill; existing field and name. Default `medium`. |
| `risk`       | `'none' \| 'medium' \| 'high' \| 'random'` | New. Default `medium`.                            |

- Seats configured in the lobby keep both values; a computer that replaces a human is `{ difficulty: 'random', risk: 'random' }`.
- The room no longer stores a resolved "effective" level; `random` is resolved inside every decision (FR-004).
- Validation: both values must be members of the sets above (gateway rejects anything else as `invalidRequest`, same as today for difficulty).

## Concrete values (after resolution)

`Skill = 'easy' | 'medium' | 'hard'`, `Risk = 'none' | 'medium' | 'high'`. `resolve(profile, rng)` returns a concrete pair, drawing skill first then risk, each with `rng(3)` when `random`.

## Decision situation (input, read only)

Derived from `GameState` and the rules, never from the draw pile order:

| Part   | Source                                                                   |
| ------ | ------------------------------------------------------------------------ |
| Turn   | `state.turn`: card, phase, dice, free, carried, run, street, volleLottes |
| Rules  | `state.rules`: minimum points, doubling, target score, `cardCounts`      |
| Scores | `state.players[].score`, `state.current`                                 |

## Derived tables (memoised, shared, not persisted)

| Name           | Key                                         | Content                                                                    |
| -------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| Odds           | doubling flag, free dice n (1..6)           | outcome multisets, probability, legal picks (points, dice used), bust flag |
| Stopping table | minimum, doubling, carried bucket, kappa id | `V[n][runBucket]` expected value of the best continuation                  |
| Card values    | rules key, carried bucket, kappa id         | `EV(draw)` per card type and their weighted sum                            |

Bounds: fixed maximum entries with LRU eviction; run bucket step 50, carried bucket step 250, both with a cap above which the computer banks when allowed.

## Situation shift

`shift = f(deficit to leader / target, own score / target)`; added to the risk's kappa. A bank that reaches the target is decided before any table lookup.

## State transitions

None new. The profile is fixed for a seat during a game; the game state machine is untouched.
