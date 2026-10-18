# Tasks: Computer Player AI Rework

**Input**: Design documents from `/specs/011-computer-ai-rework/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/protocol.md](contracts/protocol.md), [quickstart.md](quickstart.md)

**Tests**: Requested by the spec (FR-019, SC-001..SC-006: invariant, situation, tournament and performance tests; Constitution III). Test tasks are included and written before the implementation they cover.

**Organization**: Tasks are grouped by user story. Phases are ordered by priority (US1, US2, US3, US6 are P1; US4, US5 are P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1..US6)

## Path Conventions

- Rules engine: `libs/game-rules/src/lib/` (new code in `computer/`)
- Backend: `apps/backend/src/app/lobby/`
- Frontend: `apps/frontend/src/app/`
- Run Nx via npm: `npm run test|lint|typecheck`; module boundaries (`scope:*` tags) must stay intact.

---

## Phase 1: Setup

**Purpose**: Create the module layout without changing behaviour.

- [x] T001 Create the folder `libs/game-rules/src/lib/computer/` and a `constants.ts` there that exports all tunable numbers as named, documented constants (kappa per risk `none`/`medium`/`high`, logistic `scale` and `shift` for medium/high, medium-skill softmax temperature, score-situation shift strength, run bucket step 50, carried bucket step 250, bucket caps, maximum cache entries). Initial values per [research.md](research.md) R3-R6; add a comment that the numbers are tuned by the tournaments (T037).
- [x] T002 [P] Add a tiny bounded LRU map helper in `libs/game-rules/src/lib/computer/lru.ts` (`class Lru<K, V>` with `get`, `set`, `size`, fixed `maxEntries`, evicts the least recently used entry) and its spec `libs/game-rules/src/lib/computer/lru.spec.ts` (eviction order, size never above max).

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Profile types, exact odds, value tables and the new `chooseAction(state, profile, rng)` signature. The old behaviour stays as the `easy` heuristic so the game keeps working. No user story can start before this phase is done.

**CRITICAL**: complete before Phase 3+.

- [x] T003 Add `export type Risk = 'none' | 'medium' | 'high' | 'random';` next to `Difficulty` in `libs/game-rules/src/lib/protocol.ts` (type only; `PROTOCOL_VERSION` is bumped in T015) and add an `isRisk`-style member list export if `Difficulty` has one, mirroring it.
- [x] T004 Create `libs/game-rules/src/lib/computer/profile.ts`: `type Skill = 'easy' | 'medium' | 'hard'`, `type ConcreteRisk = 'none' | 'medium' | 'high'`, `interface Profile { difficulty: Difficulty; risk: Risk }`, `DEFAULT_PROFILE = { difficulty: 'medium', risk: 'medium' }`, and `resolve(profile, rng): { skill: Skill; risk: ConcreteRisk }` which draws skill first, then risk, each with `rng(3)` only when the value is `random` (R7, data-model). Spec: `profile.spec.ts` in the same folder (concrete values pass through without consuming rng; `random` consumes exactly one `rng(3)` each, skill before risk).
- [x] T005 [P] Create `libs/game-rules/src/lib/computer/odds.ts`: for the doubling flag (two variants) and free dice n = 1..6, enumerate outcomes as multisets of face counts (462 for n = 6, 923 in total) with exact probability, and for each outcome the legal picks (scoring sub-multisets with `points`, `dice used`, and whether a pick uses all dice), plus `bustProbability(n, doubling)`. Use `scoreDice` from `../scoring.js`; lazily built, module-level memo. Spec `odds.spec.ts`: probabilities of each n sum to 1 (epsilon), bust probabilities match 0.667, 0.444, 0.278, 0.157, 0.077, 0.031, total multiset count 923, picks agree with `scoreDice`.
- [x] T006 Create `libs/game-rules/src/lib/computer/value.ts` (depends on T001, T002, T005): memoised backward induction `V(n, runBucket)` per key `(minimumPoints, doubling, carriedBucket, kappaId)` stored in the `Lru`; `bank` allowed only when the run reaches the minimum; bust valued as `-kappa * (carried + run)`; a pick using all dice is a Volle Lotte on a Bonus card (value = bank, draw handled in T024). Above the carried cap the table returns "bank when allowed". Export `valueOf(n, run, carried, rules, kappa)`, `bestPick(...)` (argmax of `points + continuation`) and `throwValue(...)`. Spec `value.spec.ts`: monotone in run points, `V` equals bank value when throwing cannot improve, a bust-heavy single die is never preferred over banking a large run, cache size never exceeds the maximum under many distinct `minimumPoints`.
- [x] T007 Move the current heuristic into `libs/game-rules/src/lib/computer/easy.ts` as the easy skill (old `BANK_AT.easy`, `KEEP_THROWING_FROM.easy`, fewest-dice pick with the `pickBy` tie breaking through `rng`) and export `chooseEasy(state, legal, rng)`.
- [x] T008 Rewrite `libs/game-rules/src/lib/computer.ts` as the public entry (keep the export path via `libs/game-rules/src/index.ts`): export `chooseAction(state, profile, rng): Action`, `Profile`, `Skill`, `DEFAULT_PROFILE`; it resolves the profile (T004), computes `legalActions`, dispatches to `chooseEasy` for now for every skill and keeps the final "result is one of the legal actions" guard. Remove the `ComputerLevel` export. Update `libs/game-rules/src/lib/computer.spec.ts` and `libs/game-rules/src/lib/simulation.spec.ts` to the new signature (pass `{ difficulty, risk: 'medium' }`).
- [x] T009 Adapt the backend to the new signature in `apps/backend/src/app/lobby/game-room.ts`: seat stores `{ difficulty, risk }`, remove `levelFor` and the `effective` field, call `chooseAction(this.game, { difficulty: seat.difficulty, risk: seat.risk }, this.rng)` (line ~417); `setSeat` takes an optional `risk: Risk = 'medium'` after `difficulty`; the replacement computer in the leave handler (line ~524) gets `{ difficulty: 'random', risk: 'random' }`. Update `apps/backend/src/app/lobby/game-room.spec.ts` for the new seat shape (no `effective`).
- [x] T010 Run `npm run typecheck && npm run test` and fix fallout; behaviour must still equal the old easy play. (Checkpoint before the stories.)

**Checkpoint**: Foundation ready - profile, odds and value tables exist, the game still runs.

---

## Phase 3: User Story 1 - Computer opponents that play sensibly (Priority: P1) MVP

**Goal**: hard and medium decide by expected value (dice choice and bank-or-throw), easy keeps the simple rule of thumb.

**Independent Test**: situation specs (3x4 with 3 dice left banks, 4x1 with 2 dice left banks, 3 of a kind vs singles, several 1s with a 5) pass and a seeded hard > medium > easy tournament passes.

### Tests for User Story 1 (write first, they must fail before implementation)

- [x] T011 [P] [US1] Add situation specs in `libs/game-rules/src/lib/computer/decide.spec.ts`: hard on a first throw with 400 points (three 4s), 3 dice left, Bonus card, minimum reached -> `bank`; hard with 1,000 points (four 1s), 2 dice left -> `bank`; hard with a throw of three of a kind plus scoring singles and with several 1s plus a 5 -> the chosen `select` equals the argmax of `points + continuation` from `value.ts`; easy may choose differently (assert it still returns a legal action); minimum points 0 and a very high minimum, doubling on/off.
- [x] T012 [P] [US1] Add `libs/game-rules/src/lib/tournament.spec.ts` with a seeded bot tournament helper (plays full games through `game.ts` with `chooseAction`, seeded `RandomInt` from `rng.ts`, bounded game count, e.g. 300 games per pairing so the spec stays in the normal test target) asserting hard beats medium and medium beats easy by the margin from SC-001 (>= 5 percentage points above an even share in a 3-player table of one each, rotating seats). The full 1,000-game confirmation is done in T045.

### Implementation for User Story 1

- [x] T013 [US1] Create `libs/game-rules/src/lib/computer/select.ts`: `chooseSelect(state, legal, skill, kappa, rng)`; hard = argmax over legal `select` actions of `points + continuation` using `bestPick`/`valueOf` (ties broken by `rng` without bias), medium = softmax over the same option values with the temperature from `constants.ts`, easy = `chooseEasy` behaviour.
- [x] T014 [US1] Create `libs/game-rules/src/lib/computer/decide.ts`: `chooseBankOrThrow(state, legal, skill, kappa, rng)` comparing `bank(run)` with `throwValue(...)` from `value.ts` (hard argmax, medium softmax, easy old thresholds); never returns an illegal action (bank only if in `legal`); ties are broken through `rng`. Wire `select.ts` and `decide.ts` into `libs/game-rules/src/lib/computer.ts` (draw decisions stay on the old fallback until US3). The kappa for now comes from the resolved risk via `constants.ts` (no score shift yet).

**Checkpoint**: US1 is functional and testable on its own (engine only).

---

## Phase 4: User Story 2 - Host sets skill and risk per computer seat (Priority: P1)

**Goal**: protocol v6, the lobby shows two selects per computer seat, replacements are random/random.

**Independent Test**: in the lobby set three computer seats to different combinations; the seat views carry both values; an old client gets `versionMismatch`.

### Tests for User Story 2

- [x] T015 [P] [US2] Update `apps/backend/src/app/lobby/lobby.gateway.spec.ts` and `apps/backend/src/app/lobby/lobby.gateway.e2e.spec.ts`: `seat:set` with a valid `risk` is stored and shown in `SeatView.risk`; `risk` absent defaults to `medium`; an invalid `risk` -> `invalidRequest`; `risk` ignored for `open`/`locked`; `session:start` with protocol version 5 -> `versionMismatch`. Update `apps/backend/src/app/lobby/game-room.spec.ts`: a replacement computer reports `difficulty: 'random'`, `risk: 'random'` in the view.
- [x] T016 [P] [US2] Extend `apps/frontend/src/app/game-lobby/game-lobby.spec.ts`: each computer seat row has a skill select and a risk select, both default "Medium"; changing the risk emits `seat:set` with `risk`; per-seat aria labels (`gameLobby.riskSeat`) present.

### Implementation for User Story 2

- [x] T017 [US2] In `libs/game-rules/src/lib/protocol.ts`: set `PROTOCOL_VERSION = 6`, add `risk?: Risk` to `SeatView` (computer seats, line ~73) and to the `seat:set` intent (line ~131) per [contracts/protocol.md](contracts/protocol.md).
- [x] T018 [US2] In `apps/backend/src/app/lobby/lobby.gateway.ts` (line ~213): validate `b['risk']` like `difficulty` (absent allowed, present but not one of `none|medium|high|random` -> `invalidRequest`), pass `risk` to `room.setSeat(session.playerId, seat, mode, difficulty, risk)`.
- [x] T019 [US2] In `apps/backend/src/app/lobby/view.ts` (line ~20): computer seat views include `risk: s.risk`; update the doc comment (`random` difficulty and risk stay `random`).
- [x] T020 [P] [US2] Add the English and German texts in `apps/frontend/src/app/i18n/en.ts` and `apps/frontend/src/app/i18n/de.ts`: labels `risk.none`, `risk.medium`, `risk.high`, `risk.random` (en: No risk / Medium / High / Random, de: Kein Risiko / Mittel / Hoch / Zufall), a short explanation for the risk select, and the per-seat aria label `gameLobby.riskSeat`.
- [x] T021 [US2] In `apps/frontend/src/app/game-lobby/game-lobby.ts` add the second select per computer seat beside the difficulty select (same pattern and component as the difficulty select), default `medium`, sending `seat:set` with `difficulty` and `risk`; keep the selected value of the other select when one changes; update `apps/frontend/src/app/core/socket.service.ts` types if the intent payload is typed there.
- [x] T022 [US2] Verify in the running app with the `verify-ui` skill: three computer seats with different combinations, language switch en/de, second browser sees the same seat settings (quickstart section 2).

**Checkpoint**: US2 works end to end; computers already play with the US1 logic.

---

## Phase 5: User Story 3 - Risk shapes the draw decision after a Volle Lotte (Priority: P1)

**Goal**: bank-or-draw by the value of drawing per card type, with risk none/medium/high behaviour.

**Independent Test**: repeat fixed Volle Lotte situations many times per risk and compare the draw share (none 0 %, medium ~50 % at indifference and falling with more Stop cards or carried points, high clearly more but pulled down by huge carried points with many Stop/Plus-Minus cards).

### Tests for User Story 3

- [x] T023 [P] [US3] Add `libs/game-rules/src/lib/computer/cards.spec.ts`: shares come from `rules.cardCounts` only (changing the real deck order in the state does not change the result); each card type outcome per [research.md](research.md) R4 (Stop loses carried points, bust after Bonus/Double Lotte/Street/Plus-Minus/Clover loses everything, Plus/Minus yields only +1,000, Star cannot lose, Clover can win the game); a deck without Bonus cards creates no draw decision; `P(street)` from the 64-subset DP matches a brute-force count.
- [x] T024 [P] [US3] Add draw situation specs in `libs/game-rules/src/lib/computer/decide.spec.ts` (new describe block): risk `none` draws 0 % over 1,000 seeded decisions whatever the carried points and cards; risk `medium` at indifference (construct carried points where `A = EV(draw) - C` is about 0 by bisecting in the test) draws between 40 % and 60 %; more Stop cards or more carried points -> lower draw share; risk `high` in a normal situation draws clearly more than medium; `high` with very high carried points and many Stop and Plus/Minus cards draws noticeably less than in the normal situation; same state + same seed -> same decision (FR-019).

### Implementation for User Story 3

- [x] T025 [US3] Create `libs/game-rules/src/lib/computer/cards.ts`: `drawValue(state, kappa)` returning `EV(draw)` as the share-weighted sum over card types using only `rules.cardCounts` (never `state.deck` order), with the per-type outcome table from R4: Stop `-kappa * C`; Bonus `V(6, 0 | carried C)`; Star `C + E[star run]`; Double Lotte `P(VL) * (C + 2 * run_VL) - (1 - P(VL)) * kappa * C`; Street `P(street) * 2000 - (1 - P(street)) * kappa * C`; Plus/Minus `P(VL) * 1000 - (1 - P(VL)) * kappa * C`; Clover `P(2 VL) * win - (1 - P(2 VL)) * kappa * C` with `win` = remaining distance to the target score. `P(VL)`, `P(street)`, `E[star run]` come from `odds.ts` under the take-all-dice policy; memoised in the `Lru` by `(rules key, carried bucket, kappaId)`.
- [x] T026 [US3] Extend `libs/game-rules/src/lib/computer/decide.ts` with `chooseBankOrDraw(state, legal, skill, risk, kappa, rng)`: advantage `A = drawValue - C`; risk `none` never draws; `medium` draws with probability `logistic(A / scale)` (50 % at `A = 0`); `high` uses the same logistic with the positive shift and smaller loss weight from `constants.ts`; the random number comes from `rng`. Only chosen when both `bank` and `draw` are legal; wire into `libs/game-rules/src/lib/computer.ts`. Easy skill keeps its old simple draw rule.

**Checkpoint**: US1-US3 work; the main visible risk decision behaves as specified.

---

## Phase 6: User Story 6 - Always all dice on special cards (Priority: P1)

**Goal**: on Street, Double Lotte, Plus/Minus, Clover and Star every skill sets aside all dice it legally can.

**Independent Test**: in simulated games no chosen selection on these cards has fewer dice than another legal selection (SC-003).

### Tests for User Story 6

- [x] T027 [P] [US6] Add `libs/game-rules/src/lib/computer/invariants.spec.ts` (all-dice part): for every skill (including `random`) and a seeded set of games with random rules, on Street/Double Lotte/Plus-Minus/Clover/Star every `select` chosen has the maximum dice count among legal selections; on a Street with several still-missing values the chosen selection takes one die of every still-missing value.

### Implementation for User Story 6

- [x] T028 [US6] In `libs/game-rules/src/lib/computer/select.ts` add `allDiceFilter(card, legal)` applied before the skill evaluation for those five card types (keeps only the legal selections with the maximum number of dice; ties still resolved by the skill); apply it for easy, medium, hard in `chooseSelect`. Make sure `chooseEasy` also goes through the filter.

**Checkpoint**: all P1 stories complete.

---

## Phase 7: User Story 4 - Score situation changes the risk (Priority: P2)

**Goal**: far behind -> more risk, close to the target -> less risk, reaching the target always banks.

**Independent Test**: the same turn situation with different scores yields more risky choices when behind and fewer when near the target; a bank that reaches the target is always taken.

### Tests for User Story 4

- [x] T029 [P] [US4] Add `libs/game-rules/src/lib/computer/situation.spec.ts`: `shift` is lower (more risk-taking) with a bigger deficit to the leading opponent, higher near the target, 0 when level mid-game; with the same turn state and seed the share of `draw`/`throw` over many decisions is higher when far behind than when level and lower when near the target (US4 scenarios 1-2); a bank that reaches or exceeds the target is chosen for every skill and every risk (including `none` and `random`), also when throwing would have a higher value.

### Implementation for User Story 4

- [x] T030 [US4] Create `libs/game-rules/src/lib/computer/situation.ts`: `kappaFor(state, risk)` = risk kappa from `constants.ts` plus `shift(deficit to leader / target, own score / target)` (shift strength constant from T001); `reachesTarget(state)` true when banking (or the value at stake for the current card) reaches `rules.targetScore`.
- [x] T031 [US4] Use `kappaFor` everywhere a kappa is needed (`select.ts`, `decide.ts`, `cards.ts` callers in `libs/game-rules/src/lib/computer.ts`) and add the target check first in `chooseAction`: if `bank` is legal and `reachesTarget(state)`, return it before any table lookup (FR-016). Replace the temporary kappa from T014.

**Checkpoint**: US4 independently verifiable.

---

## Phase 8: User Story 5 - Random computers change their mind every decision (Priority: P2)

**Goal**: `random` skill and `random` risk are drawn fresh and independently per decision.

**Independent Test**: over at least 3,000 decisions each concrete value occurs in 30-37 % of the decisions and the chosen actions vary.

### Tests for User Story 5

- [x] T032 [P] [US5] Extend `libs/game-rules/src/lib/computer/profile.spec.ts` and add to `invariants.spec.ts`: over 3,000+ decisions with skill `random` each of easy/medium/hard occurs 30-37 % (spy on `resolve`), same for risk `random`; skill `random` with risk `medium` varies only the skill (risk stays `medium`); the two draws are independent (joint counts near 1/9 each); same seed -> same decisions.

### Implementation for User Story 5

- [x] T033 [US5] Verify `libs/game-rules/src/lib/computer.ts` calls `resolve(profile, rng)` once at the start of every `chooseAction` call (no per-seat memo, no module state) and that nothing downstream re-resolves; fix if the foundation wiring (T008) deviates. Remove any leftover fixed-once-per-player resolution in `apps/backend/src/app/lobby/game-room.ts` (FR-004, assumption "per-decision resolution").

**Checkpoint**: all user stories are independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: invariants for all combinations, performance, tuning, docs.

- [x] T034 [P] Finish `libs/game-rules/src/lib/computer/invariants.spec.ts`: across all skill x risk combinations (including `random`) and seeded games with random rules (minimum points 0 and very high, doubling on/off, decks without Stop, without Bonus, single card type) every chosen action is in `legalActions(state)` and every game ends (SC-004; bounded game count in the normal test target, the 10,000-game run is the opt-in in T045); the same state and seed give the same decision; the decision never reads `state.deck` order (swap deck order, same decision).
- [x] T035 [P] Add `libs/game-rules/src/lib/computer/performance.spec.ts`: first decision with cold tables below 50 ms (run in a fresh module registry via `jest.isolateModules`), steady-state decision with warm tables well below 1 ms (average over many calls with a generous bound to avoid flakiness), cache entry count stays at or below the maximum after decisions with 200 distinct `minimumPoints` (SC-006, R6).
- [x] T036 Add a `warmUp(rules)` export in `libs/game-rules/src/lib/computer.ts` (builds odds for both doubling variants and the default-rules tables) and call it once at server start in `apps/backend/src/main.ts` (or the lobby module `onModuleInit` in `apps/backend/src/app/lobby/lobby.module.ts`) with the default rules (R6). Add a backend spec asserting the call does not throw.
- [x] T037 Tune the constants in `libs/game-rules/src/lib/computer/constants.ts` with the tournaments (T012 helper): hard > medium > easy by >= 5 percentage points above an even share, medium risk about 50 % at indifference, high clearly above medium; keep only orderings fixed by the spec and document the final numbers in comments.
- [x] T038 [P] Update documentation in English: computer skill and risk in `docs/user-guide.md` (what each skill and risk means, random is per decision, replacement computers, score situation, special cards always take all dice), a short note in `README.md` if it lists computer features, `docs/roadmap.md` (mark R7 done, list it under done), and `docs/rules.md` only if it states computer behaviour (rules themselves are unchanged).
- [x] T039 [P] Update the example in `specs/011-computer-ai-rework/contracts/protocol.md` only if the final wire format deviates from it; otherwise leave unchanged.
- [x] T040 Run `npm run lint && npm run typecheck && npm run test` (quickstart section 1) and fix anything red.
- [x] T041 Run the quickstart behaviour checks 2 and 3 in the real app with the `verify-ui` skill (Hard/No risk banks after every Volle Lotte on a Bonus card; Easy/High risk plays simpler and draws on; Random/Random varies; replacement computer shows "Random").
- [ ] T042 Optional manual load check (quickstart section 4, `npm run test:e2e` via the `run-e2e` skill): several rooms with eight computers, no extra websocket messages per move compared with `main`, no stalls at the first decision.
- [ ] T043 Run the `speckit-sonar-local` skill (or `speckit-sonar-validate` once a PR exists) and fix reported issues in the new code.
- [x] T044 [P] Review `apps/backend/src/app/lobby/game-room.ts` and `libs/game-rules/src/lib/computer/` for dead code left from the old `ComputerLevel`/`levelFor` path and remove it.
- [x] T045 Confirm the large-scale success criteria once with a throwaway script run via the scratchpad (not committed): 1,000+ seeded games hard/medium/easy (SC-001), 10,000 random-rule games over all combinations (SC-004), shares of random skill/risk (SC-005); record the numbers in the PR description.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none; T001 and T002 can run together.
- **Foundational (Phase 2)**: after Setup; T003, T004, T005 start in parallel (T004 needs T003), then T006 (needs T001, T002, T005), T007, T008 (needs T004, T006, T007), T009 (needs T008), T010 last. **Blocks all stories.**
- **US1 (Phase 3)**: after Phase 2. Independent of the UI.
- **US2 (Phase 4)**: after Phase 2; independent of US1 logic (can run in parallel with US1/US3 by another developer). T017 -> T018/T019 -> T021; T020 parallel.
- **US3 (Phase 5)**: after Phase 2 and T014 (`decide.ts` exists); T025 needs `value.ts` and `odds.ts`.
- **US6 (Phase 6)**: after T013 (`select.ts` exists).
- **US4 (Phase 7)**: after US1 and US3 (it changes the kappa they use); T031 touches the same files.
- **US5 (Phase 8)**: after Phase 2 (profile exists), final verification after US1-US4.
- **Polish (Phase 9)**: after the stories; T037 (tuning) before T045 and T038.

### Within each story

Tests first and failing, then types/data, then logic, then wiring.

### Parallel Opportunities

- T001 || T002; T003 || T005; T007 can run while T005/T006 are in progress.
- Test-writing tasks marked [P] in each story (T011 || T012, T015 || T016, T023 || T024) run together.
- US2 (backend/frontend) in parallel to US1/US3 (engine) with a second developer: only `game-room.ts` is touched by both T009 and T018/T019 (do T009 first).
- Polish: T034 || T035 || T038 || T039 || T044.

## Parallel Example: Foundational

```text
Task: "T005 odds.ts + odds.spec.ts in libs/game-rules/src/lib/computer/"
Task: "T007 easy.ts in libs/game-rules/src/lib/computer/"
Task: "T004 profile.ts + profile.spec.ts in libs/game-rules/src/lib/computer/"
```

## Implementation Strategy

### MVP First (US1)

1. Phase 1 and 2 (the game plays as before, new signature).
2. Phase 3 (US1): hard/medium decide by expected value. STOP and validate with the situation specs and the tournament.

### Incremental Delivery

1. Foundation -> US1 (better play, default risk medium) -> US2 (host can pick skill and risk, protocol v6) -> US3 (risk shapes draw) -> US6 (all-dice rule) -> US4 (score situation) -> US5 (per-decision random) -> Polish.
2. Each phase leaves `npm run test` green and the app playable. The protocol bump (T017) ships together with the frontend change (T021) in the same release.

## Notes

- Commits follow Conventional Commits in English (`feat(game-rules): ...`, `feat(backend): ...`, `feat(frontend): ...`); one commit per task or logical group; husky hooks run lint-staged on commit and affected tests on push.
- Every decision function stays pure; the only module state is the bounded memo of pure results (Complexity Tracking in plan.md).
- Never use `state.deck` order in any decision (FR-010, FR-018).
