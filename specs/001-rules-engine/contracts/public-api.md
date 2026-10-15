# Public API: `@volle-lotte/game-rules`

Everything below is exported from `libs/game-rules/src/index.ts`. Types are in [data-model.md](../data-model.md). The library performs no I/O and never mutates its arguments.

```ts
type RandomInt = (maxExclusive: number) => number; // returns an integer in [0, maxExclusive)

type Outcome =
  { ok: true; state: GameState; events: Event[] } | { ok: false; reason: Rejection['reason'] };
```

## Functions

| Function                          | Returns                                                | Contract                                                                                                                    |
| --------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `defaultRules()`                  | `Rules`                                                | The defaults from rules.md (6,000 target, 350 minimum, doubling on, 56-card set).                                           |
| `createGame(names, rules, rng)`   | `GameState`                                            | 2-8 names, throws `RangeError` on bad input (programmer error). Shuffles the deck, player 0 starts in phase `draw`.         |
| `applyAction(state, action, rng)` | `Outcome`                                              | The only way to advance a game. Rejections leave the input untouched. Dice and reshuffles use only `rng`.                   |
| `legalActions(state)`             | `Action[]`                                             | Every action `applyAction` would accept now (all valid `select` subsets, `throw`, `bank`, `draw`). Empty when game is over. |
| `scoreDice(values, rules)`        | `number`                                               | Points of a set of dice (port of `Punkte.wert`/`bewerte`); `-1` if the set is not entirely scoring.                         |
| `hasScoringDie(values)`           | `boolean`                                              | False means a throw is a bust (port of `Punkte.hatPunkte`).                                                                 |
| `ranking(state)`                  | `{ rank: number; players: number[] }[]`                | Current standings by score; ties share a rank. Valid at any time.                                                           |
| `toJSON(state)`                   | `unknown`                                              | Plain JSON-safe copy of the state.                                                                                          |
| `fromJSON(data)`                  | `{ ok: true; state } \| { ok: false; reason: string }` | Validates shape, ranges and cross-field consistency; never throws on malformed input.                                       |

## Guarantees

- **Determinism**: same state, action and `rng` sequence give the same outcome (SC-004).
- **Round trip**: `fromJSON(toJSON(s))` yields a state that behaves identically for any further actions (SC-005).
- **Atomicity**: a rejected action changes nothing.
- **Server use**: the server passes `(n) => crypto.randomInt(n)`; clients never call `applyAction` with a real RNG.

## Rejection reasons

`gameOver`, `wrongPhase`, `emptySelection`, `invalidIndex`, `duplicateIndex`, `nonScoringDie`, `incompleteFireworks`, `belowMinimum`, `nothingToBank`. Stable strings; the UI maps them to messages.
