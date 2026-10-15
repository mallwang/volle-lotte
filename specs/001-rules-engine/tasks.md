# Tasks: Rules Engine

**Input**: Design documents from `/specs/001-rules-engine/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [contracts/public-api.md](contracts/public-api.md), [research.md](research.md), [quickstart.md](quickstart.md)

**Tests**: Required (FR-025, SC-001..SC-003). Each story writes its specs first and they must fail before the implementation. The Java reference lives in `tmp/java/` (read-only); `docs/rules.md` wins where they differ.

**Organization**: Grouped by user story. All paths are inside `libs/game-rules/` (Nx project `game-rules`). Run checks with `npx nx test game-rules`, `npx nx lint game-rules`, `npx nx typecheck game-rules`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story the task belongs to (US1..US5)

---

## Phase 1: Setup

**Purpose**: Replace the generator stub and create the empty module skeleton.

- [x] T001 Delete the generator stubs `libs/game-rules/src/lib/game-rules.ts` and `libs/game-rules/src/lib/game-rules.spec.ts`
- [x] T002 Create `libs/game-rules/src/lib/types.ts` with all types from data-model.md: `CardType`, `Rules`, `Player`, `Turn`, `GameState`, `Result`, `Action`, `Rejection`, `Event`, `Outcome`, `RandomInt`, plus `defaultRules()` (default 56-card `cardCounts`, target 6000, minimum 350, doubling on)
- [x] T003 Create `libs/game-rules/src/index.ts` exporting the public API listed in contracts/public-api.md (re-export from the `lib/*` files; add each export as its file is implemented, leave no stub code)

**Checkpoint**: `npx nx typecheck game-rules` passes.

---

## Phase 2: Foundational

**Purpose**: Randomness helpers every story's tests need.

- [x] T004 Create `libs/game-rules/src/lib/rng.ts`: `shuffle<T>(items, rng)` (Fisher-Yates, returns a new array), `seededRandomInt(seed)` (small deterministic PRNG such as mulberry32, test helper), `scriptedRandomInt(values)` (returns the given numbers in order, throws when exhausted; used to script dice and shuffles in specs)
- [x] T005 [P] Create `libs/game-rules/src/lib/rng.spec.ts`: shuffle keeps the multiset and does not mutate its input, same seed gives the same shuffle, scripted source returns values in order and throws when exhausted

**Checkpoint**: Foundation ready; user stories can start.

---

## Phase 3: User Story 1 - Score a throw (Priority: P1) 🎯 MVP

**Goal**: `scoreDice` and `hasScoringDie` (port of Java `Punkte`).

**Independent Test**: `npx nx test game-rules --testPathPattern=scoring` passes, including the ported `PunkteTest` cases.

### Tests for User Story 1

- [x] T006 [US1] Create `libs/game-rules/src/lib/scoring.spec.ts`: port every case of the Java `PunkteTest` (see `tmp/java/`) 1:1; add cases for spec acceptance scenarios 1-6 (150 for 1+5, 300 for three 3s, 1000 for three 1s, bust `2,3,4,6,2,3`, lone 2 returns -1), four/five/six of a kind with `fourOfAKindDoubling` on and off, three 2s plus 1 and 5, and an empty set. Document any deliberate difference from Java in a comment

### Implementation for User Story 1

- [x] T007 [US1] Create `libs/game-rules/src/lib/scoring.ts`: `scoreDice(values, rules)` (FR-001..FR-003, returns -1 if any die is not part of a scoring combination, no combinations across throws), `hasScoringDie(values)` (FR-004); export both from `src/index.ts`

**Checkpoint**: US1 specs pass.

---

## Phase 4: User Story 2 - Play one turn (Priority: P1)

**Goal**: One turn without card-specific effects: throw, select, bank, bust, minimum, Volle Lotte detection. Cards at this stage are treated as a plain Bonus card with a fixed value; effects come in US3.

**Independent Test**: A scripted dice source drives `turn.ts` through throw, select, bank and bust; resulting turn and credited points match the expectations.

### Tests for User Story 2

- [x] T008 [US2] Create `libs/game-rules/src/lib/turn.spec.ts` (basic block): port every case of the Java `RundeTest` 1:1, then add spec scenarios US2-1..7: bank credits points and ends the turn, empty/non-scoring selection rejected (`emptySelection`, `nonScoringDie`), `invalidIndex`, `duplicateIndex`, partial selection then `throw` rolls only the free dice and keeps points, bust ends the turn with 0 points, `belowMinimum` at 349 and accepted at 350 and with minimum 0, `nothingToBank`, Volle Lotte gives six fresh dice, wrong phase leaves the turn unchanged (FR-010)

### Implementation for User Story 2

- [x] T009 [US2] Create `libs/game-rules/src/lib/turn.ts` with a pure function `step(rules, turn, action, rng)` returning `{ ok: true, turn | null, credit, events } | { ok: false, reason }` for phases `throw`, `select`, `decide`: dice thrown via `rng(6) + 1`, selection by indexes into `turn.dice` validated with `scoreDice`, `run += points`, `free -= selected`, bust detection via `hasScoringDie`, `bank` check `run >= minimumPoints` (FR-005..FR-010). Volle Lotte (`free = 0`) is detected here and delegated to a `resolveVolleLotte` hook that US3 fills in (default for now: refresh `free = 6`, phase `throw`)

**Checkpoint**: US2 basic specs pass.

---

## Phase 5: User Story 3 - Cards and their effects (Priority: P1)

**Goal**: Deck, draw with reshuffle, and all card effects.

**Independent Test**: Per card type, a scripted turn with a fixed card and dice gives the expected turn points and scores; deck composition and reshuffle are tested separately.

### Tests for User Story 3

- [x] T010 [P] [US3] Create `libs/game-rules/src/lib/cards.spec.ts`: default deck has 56 cards with the default counts (5 Star), custom counts give exactly those counts, `draw` pops the last element, an empty deck is reshuffled from the full configured set and emits `deckReshuffled`, repeated reshuffles, port of Java `SpielTest.deckReshufflesWhenEmpty`
- [x] T011 [US3] Extend `libs/game-rules/src/lib/turn.spec.ts` with one `describe` block per card, each pinning a spec scenario: Bonus (US3-1, `run += N`, then bank or draw), Stop at turn start and after a Volle Lotte (credits `carried`), Double Lotte (only `run` doubled, earlier `carried` counts once, FR-016b), Star (bust credits all points, any non-empty selection of scoring dice is allowed, Volle Lotte ends the turn without minimum, `bank` never allowed, FR-016f), Street (cumulative collection, bust = 0 including `carried`, success credits exactly 2,000 with 2,300 held → 2,000, turn ends, FR-015), Plus/Minus (+1,000 to the player, turn points discarded, all tied leaders lose 1,000, leading player loses nothing, never below 0, `penalty` events, FR-016c), Clover (two new Volle Lotte win, earlier ones do not count, bust loses all, no win), Bonus chain (Volle Lotte on Bonus then `draw`: next Bonus needs 350 in its run or the whole turn is lost, next Street/Double Lotte/Clover must succeed or everything is lost, FR-016d/e)

### Implementation for User Story 3

- [x] T012 [US3] Create `libs/game-rules/src/lib/cards.ts`: `buildDeck(rules, rng)` (expand `cardCounts`, shuffle), `drawCard(deck, rules, rng)` returning `{ card, deck, reshuffled }` (reshuffle from the full configured set when empty, top = last element)
- [x] T013 [US3] Extend `libs/game-rules/src/lib/turn.ts`: add phase `draw` (card drawn via `cards.ts`, Stop credits `carried` and ends the turn, other cards set `free = 6`, `run = 0`, phase `throw`; `draw` after a Bonus Volle Lotte moves `run` into `carried`), implement `resolveVolleLotte` per card as in the data-model.md "Volle Lotte by card" table, Street cumulative collection and its bust rule, Star crediting bust (normal selection rule: at least one scoring die per throw), and the "must succeed / needs minimum" flags for the card following a Bonus Volle Lotte (store as an extra `Turn` field in `types.ts` and `data-model.md` if needed). Plus/Minus and Clover need the player list, so `step` returns an `effect` the game layer applies (`{ type: 'plusMinus' } | { type: 'cloverWin' }`)

**Checkpoint**: US3 specs pass; every card in docs/rules.md has a failing-when-broken test (SC-002).

---

## Phase 6: User Story 4 - Run a game (Priority: P2)

**Goal**: `createGame`, `applyAction`, `legalActions`, `ranking`: turn order, target score, game over.

**Independent Test**: Games with 2 to 8 players and scripted turns give the expected turn order, scores, winner and ranking.

### Tests for User Story 4

- [x] T014 [US4] Create `libs/game-rules/src/lib/game.spec.ts`: port Java `SpielTest.playersTakeTurns`; creation with 2 and 8 players, rejection (`RangeError`) for 1 and 9 players and for invalid rules (target 0, negative card count, empty deck); turn order advances and wraps; reaching the target score ends the game at once with `result`; ranking with shared ranks; Clover win ranks the winner first; actions after game over return `gameOver`; actions in the wrong phase leave the state unchanged and identical by reference-free deep equality (FR-010, FR-023); input state is never mutated (deep-freeze it in the spec); `legalActions` returns every accepted action and each of them is accepted by `applyAction` (including all valid `select` subsets)

### Implementation for User Story 4

- [x] T015 [US4] Create `libs/game-rules/src/lib/game.ts`: `createGame(names, rules, rng)` with validation (FR-017), `applyAction(state, action, rng)` wrapping `turn.step` (credit to the player, apply the Plus/Minus and Clover effects, advance `current` with wraparound, target score and Clover end the game and set `result`, `turn = null`), `ranking(state)`, `legalActions(state)`; export from `src/index.ts`

**Checkpoint**: US4 specs pass; a full game can be played through `applyAction`.

---

## Phase 7: User Story 5 - Save and restore (Priority: P2)

**Goal**: `toJSON` and `fromJSON` with validation.

**Independent Test**: Serialize at several points, restore, apply the same actions to both, results are equal.

### Tests for User Story 5

- [x] T016 [US5] Create `libs/game-rules/src/lib/serialize.spec.ts`: round trip at game start, after a draw, mid-turn in `select` and `decide`, with a pending card effect (Street with partial `street`, Clover with `volleLottes = 1`), and after game over; restored state plus the same scripted actions equals the original path; `JSON.stringify`/`JSON.parse` in between; malformed data rejected without throwing (wrong `version`, missing field, 1 or 9 players, negative or fractional score, `current` out of range, unknown card in the deck, `turn` and `result` both set or both null, `street` with duplicates or values outside 1-6, `card` null outside `draw`, `dice` length not equal to `free` in `select`, non-object input, `null`)

### Implementation for User Story 5

- [x] T017 [US5] Create `libs/game-rules/src/lib/serialize.ts`: `toJSON(state)` (deep copy of plain data) and `fromJSON(data)` with every check from the data-model.md "Validation on restore" section, returning `{ ok: false, reason }` with a readable reason on the first violation; export from `src/index.ts`

**Checkpoint**: US5 specs pass.

---

## Phase 8: Polish & Cross-Cutting

- [x] T018 Create `libs/game-rules/src/lib/simulation.spec.ts`: seeded random legal play (pick from `legalActions` with the seeded rng) of 10,000 complete games with 2-8 players and varied rules; assert every game ends with a `result`, no legal action is rejected, every intermediate state survives `fromJSON(toJSON(state))`, the same seed gives identical final scores and winner twice (SC-004..SC-006); runtime well under a minute
- [x] T019 [P] Update `libs/game-rules/README.md`: usage example (`createGame`, `applyAction`, `crypto.randomInt` on the server), link to `specs/001-rules-engine/contracts/public-api.md`
- [x] T020 [P] Update `docs/migration.md` porting map: mark scoring, turn, cards, game as ported to `libs/game-rules` and list deliberate differences from Java found in T006/T008
- [x] T021 Run `npx nx test game-rules --coverage`, `npx nx lint game-rules`, `npx nx typecheck game-rules`; fix findings; confirm coverage >= 95% (SC-003) and that `src/` imports nothing outside the library and uses no Node-only API
- [x] T022 Walk through [quickstart.md](quickstart.md) sections 1-4 and confirm the smoke check results

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2** → all stories. US1 first (turn needs scoring).
- **US2** depends on US1. **US3** depends on US2 (extends `turn.ts` and `turn.spec.ts`). **US4** depends on US3 (needs the full turn). **US5** depends on US4 (needs `GameState` and `createGame`). Phase 8 depends on all stories.
- Stories here are sequential on purpose: the engine is one reducer, so each layer wraps the previous one. US5 specs (T016) can be drafted in parallel with US4 implementation once `types.ts` is final.
- Within a story: specs first and failing, then implementation.

### Parallel Opportunities

- T005 (rng spec) alongside T006 (scoring spec) once T004 is done.
- T010 (cards spec) alongside T011 (turn card specs) and, after both, T012 alongside T013 only if the `drawCard` signature is fixed first.
- T019 and T020 (docs) alongside T018.

```text
# After T004:
Task: "rng.spec.ts (T005)"
Task: "scoring.spec.ts (T006)"

# Polish:
Task: "README (T019)"
Task: "docs/migration.md (T020)"
```

## Implementation Strategy

### MVP First

1. Phase 1 and 2, then US1 (scoring). Stop and validate: ported `PunkteTest` passes.
2. US2 and US3 together deliver the playable turn with all cards (the real rule set; US2 alone is only a plain dice turn).
3. US4 makes it a game; US5 adds persistence; Phase 8 proves it with 10,000 simulated games.

### Notes

- Never mutate passed-in state (FR-023); use spread and `readonly` types.
- No new dependency, no I/O, no clock (FR-022).
- Commit per task or logical group (Conventional Commits, English).
