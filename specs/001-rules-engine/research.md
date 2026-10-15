# Research: Rules Engine

No `NEEDS CLARIFICATION` remained after `/speckit-clarify`. The following design decisions resolve how to build it.

## 1. API shape: one reducer over plain data

- **Decision**: `applyAction(state, action, rng)` returns `{ ok: true, state, events }` or `{ ok: false, reason }`. Plus `createGame`, `legalActions`, `ranking`, `toJSON`, `fromJSON`.
- **Rationale**: One entry point validates phase, player and game-over in a single place (FR-010, FR-023). The server maps socket intents 1:1 to actions. Computer players and simulations use the same path.
- **Alternatives**: Classes with methods like the Java code (mutable, harder to keep history and to serialize); one function per action (duplicated validation).

## 2. Turn flow: explicit actions

- **Decision**: Actions are `draw`, `select { dice }`, `throw`, `bank`. A turn starts in phase `draw`, so the player draws the card explicitly. A Stop card ends the turn and reports it as an event; the next player draws in the next action.
- **Rationale**: No hidden chain of automatic draws, so an all-Stop custom deck cannot loop forever and the UI can show every card. `select` commits a whole selection at once (the Java toggling stays a UI concern), so the state never holds a half-made selection and every state is a valid save point.
- **Alternatives**: Auto-draw at turn start (needs a loop guard and hides the card); `toggle(index)` like Java (more actions, same result, plus a transient selection in the state).

## 3. Volle Lotte handling

- **Decision**: When `select` secures the last free die, the engine resolves it by card: Bonus adds the bonus and moves to phase `decide` (`bank` or `draw`); Double Lotte, Street, Plus/Minus, Star and Clover resolve and end the turn as in rules.md (Clover counts consecutive new Volle Lotte, see data model).
- **Rationale**: The rules differ only in what follows the Volle Lotte, so one branch per card in `turn.ts` keeps each effect local and testable.

## 4. Randomness

- **Decision**: `type RandomInt = (maxExclusive: number) => number`. The server passes `(n) => crypto.randomInt(n)`. Dice use `rng(6) + 1`; shuffle is Fisher-Yates over the same function. Tests use a scripted source (fixed list) and a seeded mulberry32 for simulation.
- **Rationale**: Matches `crypto.randomInt` exactly, no dependency, deterministic in tests (FR-021, SC-004). Fisher-Yates is unbiased, unlike `sort(() => random - 0.5)`.
- **Alternatives**: Injecting a `() => number` in [0,1) (modulo or float bias risk); a seeded PRNG inside the engine (violates Principle I).

## 5. Deck and reshuffle

- **Decision**: State holds `deck` (draw pile, top is the last element) and nothing else; there is no discard pile. When `deck` is empty at a draw, a fresh shuffled full configured set is built (same as Java and FR-011). A drawn card is held only in the turn.
- **Rationale**: Matches the spec and the Java `deckReshufflesWhenEmpty` test (120 draws from 50 cards leave 30). Smaller state, nothing to keep consistent.
- **Note**: The Java deck is 5 Bonus types × 10 = 50; the new default is 56 cards, so the ported test adapts its numbers and records this difference.

## 6. Immutability

- **Decision**: State types are `readonly` and `applyAction` builds new objects with spread (no deep-clone library, no immer). State contains only numbers, strings, booleans, arrays and plain objects.
- **Rationale**: Small state (≤ 8 players, ≤ 56 cards); copying is cheap, and plain data is already JSON-safe (FR-023, FR-024).

## 7. Serialization and validation

- **Decision**: `toJSON(state)` returns the plain object (a structural copy); `fromJSON(data: unknown)` validates with hand-written checks (versioned by a `version: 1` field) and returns `{ ok, state } | { ok: false, reason }`. Checks cover types, ranges, player count, deck card names against the card set, phase/turn consistency (e.g. a selection only on an in-range thrown die, turn player index in range).
- **Rationale**: A schema library (zod and similar) would be a new dependency for about 100 lines of checks (Principle VII). Cross-field consistency checks are needed anyway.
- **Alternatives**: zod/valibot (new dependency, shared with the backend later only if the backend needs it too).

## 8. Porting the Java tests

- **Decision**: Each Java test becomes a Jest test with the same name (English) in the matching spec file; the scripted dice replace `Iterator::next`. Java `Runde` toggling of dice maps to `select` with the same indexes. Differences to Java (documented in the test as `// differs from Java: ...`): Bonus is no longer applied when banking only at six secured dice but on the Volle Lotte, the deck has 56 cards, and `Spiel.schreiben` becomes `bank`.
- **Rationale**: SC-001 requires identical expectations except where rules.md deliberately differs.

## 9. Simulation test (SC-006)

- **Decision**: One spec plays 10,000 games with a seeded PRNG, choosing uniformly among `legalActions(state)`, asserting after every action that the state passes `fromJSON(toJSON(state))` validation and that no legal action is rejected. A guard of N actions per game fails the test if a game cannot end.
- **Rationale**: Random legal play proves liveness and consistency without a strategy. Random play must also end: a bust or bank happens with probability > 0 on every turn, and the target score is finite.
- **Risk**: Random play with a high target score may need many actions. The default test target is 2,000 to keep the runtime low; this is a test parameter, not a rule.

## 10. Selection rules to implement

- **Decision**: A selection is valid if it is non-empty, only indexes of dice from the latest throw that are not yet set aside, and every selected die belongs to a scoring combination (per `scoreDice`). With Star every scoring die and combination of the throw must be selected; with Street the selection is exactly the dice that carry a still-missing value, one die per value.
- **Rationale**: Directly from FR-004, FR-005, FR-015 and the Star rule; `legalActions` enumerates the valid subsets (at most 63 per throw).
