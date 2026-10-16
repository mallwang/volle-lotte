---
description: 'Task list for 005 dice pips and rolling animation'
---

# Tasks: Dice Pips and Rolling Animation

**Input**: Design documents from `/specs/005-dice-pips-rolling-animation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/protocol.md, quickstart.md, design.md / mockup.html

**Tests**: Included. The constitution (Principle III) requires tests with new logic (80% target); template-only wrappers may use the coverage skip list.

**Organization**: Grouped by user story. Paths are relative to the repo root. Frontend base: `apps/frontend/src/app/`. Backend base: `apps/backend/src/app/lobby/`.

## Format: `- [ ] T### [P?] [Story] Description with file path`

- **[P]**: different files, no dependency on an incomplete task
- **[Story]**: US1–US4, see spec.md

---

## Phase 1: Setup

- [ ] T001 Confirm a green baseline before changing anything: run `npm run typecheck && npm run test && npm run lint` and note any pre-existing failures. No new dependency is added in this feature.

---

## Phase 2: Foundational (blocks all stories)

**Purpose**: protocol v2 types, translations and the shared pip component.

- [ ] T002 Update `libs/game-rules/src/lib/protocol.ts`: set `PROTOCOL_VERSION = 2`, add `fastComputerDice: boolean` to `GameView`, add the intent `'game:settings': [{ fastComputerDice: boolean }, object]` to the intent map (see contracts/protocol.md). Fix every `GameView` fixture and the protocol version assertions in existing specs so `npm run typecheck` passes (`apps/backend/src/app/lobby/*.spec.ts`, `apps/frontend/src/app/core/testing.ts`, `apps/frontend/src/app/**/*.spec.ts`). Backend `view.ts` may output a temporary `fastComputerDice: false` until T021.
- [ ] T003 [P] Add the i18n keys to `apps/frontend/src/app/i18n/en.ts` and `apps/frontend/src/app/i18n/de.ts` (same key set, German translated; `i18n.spec.ts` checks parity): `dice.rolling` ("Dice are rolling…"), `dice.computerPick`, `dice.blank` (log/blank alt text if needed), `settings.title`, `settings.open`, `settings.close`, `settings.skipDice`, `settings.skipDiceHint`, `settings.fastComputerDice`, `settings.fastComputerDiceHint`, `settings.hostOnly`.
- [ ] T004 [P] Create `apps/frontend/src/app/shared/die-face.ts`: standalone component `DieFace` (selector `vl-die-face`, inline template, `OnPush`) with input `value: number | null` and optional `rolling` boolean. Renders a 3×3 CSS grid; export a pure `PIP_CELLS: Record<1|2|3|4|5|6, number[]>` map (value → grid cell indices 0–8). `null` renders the same box with no pips. Pips are `aria-hidden`; size follows `font-size` so the log can use `1.3em`. Use CSS variables from the existing theme for light/dark.
- [ ] T005 [P] Add `PIP_CELLS` + `DieFace` unit tests in `apps/frontend/src/app/shared/die-face.spec.ts`: pip count equals value for 1–6, cell indices are within 0–8 and unique, `null` renders zero pips, pips are `aria-hidden`.

**Checkpoint**: types compile, pip component exists. Stories can start.

---

## Phase 3: User Story 1 – Real dice faces with pips (P1) 🎯 MVP

**Goal**: every die on the table and in the log shows pips; selected dice use a lifted, thick-bordered cue; no digit is used for a die value.

**Independent Test**: start a game, throw, set dice aside: table and log show pips matching values 1–6, blank placeholders for unthrown slots, selection is visible without colour or checkmark, screen readers still get the value text.

- [ ] T006 [US1] Rework `apps/frontend/src/app/shared/dice-tile.ts` to render `<vl-die-face>` instead of `{{ value() ?? '?' }}`; remove the checkmark; selected state = `translateY(-5px)`, 3 px primary border and shadow (design.md); keep inputs `value`, `selected`, `disabled`, output `toggled`, and the `aria-label` from `dice.state` / `dice.notThrown`; hit area ≥ 44 px via padding around the visual die; visible focus ring kept.
- [ ] T007 [P] [US1] Change `logText` in `apps/frontend/src/app/core/game-view.ts` to return structured parts (text segments and `{ die: number }` segments) instead of joining dice as digits; keep a plain-text helper (digits joined) only where a string is still needed (toasts/aria text). Update all callers.
- [ ] T008 [US1] In `apps/frontend/src/app/table/table.ts` replace the `.vl-log-die` digit spans (`parts()`) with `<vl-die-face [value]="d">` at `1.3em`, each wrapped with a visually hidden text alternative carrying the value; keep entry order. Make the table's six slots use blank `DieFace` for unthrown dice (`slots = [0..5]` layout unchanged).
- [ ] T009 [P] [US1] Update tests: `apps/frontend/src/app/shared/tiles.spec.ts` (dice tile shows N pips, no checkmark, selected class/lift, `aria-label` unchanged, blank for `null`), `apps/frontend/src/app/table/table.spec.ts` (log entries render pip faces and no digit text node for dice), and a `logText` spec next to `game-view.ts` if none exists.

**Checkpoint**: US1 works alone (static pips, no animation). Ship as MVP.

---

## Phase 4: User Story 2 – Rolling animation with per-die random duration (P1)

**Goal**: each newly thrown die rolls for its own random 2–5 s, then shows the server value; actions locked while rolling; local skip setting; reduced motion.

**Independent Test**: press "Throw dice": thrown dice tumble, stop at different times within 2–5 s on the server value; set-aside dice stay still; buttons are disabled until the last stops; "skip dice animation" shows values immediately; with reduced motion a static "Dice are rolling…" text appears and dice stay blank until their deadline.

- [ ] T010 [P] [US2] Create `apps/frontend/src/app/core/dice-prefs.ts`: injectable `DicePrefs` with signal `skip` backed by `localStorage['vl-skip-dice']` (default `false`, tolerate missing/blocked storage), `setSkip(v)`. Never sent to the server.
- [ ] T011 [P] [US2] Create `apps/frontend/src/app/core/dice-roll.ts`: pure `rollDurations(n: number, range: [number, number], rand = Math.random): number[]` (integer ms, each independently within range), plus injectable `DiceRollService` with signals `rolling`, `deadlines`/`stopped: boolean[]`, `stoppedCount`; `start(count, { computerFast, skip })` plans durations (`[2000, 5000]`, `[1000, 2500]` when a computer thrower and `fastComputerDice`, all `0` when skip); one shared timer ticks face swaps; a new `start` never overlaps a running roll (queue or finish the previous first); `rolling` becomes false when the last die stops; exposes `faceFor(index, finalValue)` returning a random face while rolling and the final value after the die's deadline.
- [ ] T012 [P] [US2] Tests in `apps/frontend/src/app/core/dice-roll.spec.ts` (fake timers): durations within range and independent, computer-fast range, skip → immediately not rolling, last die ends `rolling`, final value always equals the server value, second `start` never overlaps, `rolling` false with 0 dice. Tests in `apps/frontend/src/app/core/dice-prefs.spec.ts`: default false, persists to `vl-skip-dice`, survives a new instance.
- [ ] T013 [US2] Add a `rolling` state to `DieFace`/`DiceTile` in `apps/frontend/src/app/shared/die-face.ts` and `dice-tile.ts`: CSS keyframe tumble (transform only, no per-frame JS) with `@media (prefers-reduced-motion: reduce)` disabling tumble and cycling, rendering the die dimmed and blank until its deadline. Rolling dice are not selectable (`disabled`).
- [ ] T014 [US2] Wire rolling into `apps/frontend/src/app/table/table.ts`: detect a new `thrown` log entry **after initial load** (compare against the cursor, not on first state), call `DiceRollService.start` with the number of newly thrown dice and thrower type; bind each thrown slot to `faceFor(i, value)`. Verify against the code whether `turn.dice` holds only the latest throw; if set-aside dice are still in the table slots, only the newly thrown slots roll (FR-008) and set-aside dice stay static. Disable select, throw and end-turn while `rolling()`.
- [ ] T015 [US2] Add a static `role="status"` live region "Dice are rolling…" (`dice.rolling`) in the dice area of `table.ts`: always present in the DOM for assistive technology while `rolling()`, visually shown only for reduced-motion users (visually hidden otherwise); it does not cover the dice and disappears when the last die stops.
- [ ] T016 [US2] Create `apps/frontend/src/app/table/settings-dialog.ts` (PrimeNG Dialog + ToggleSwitch, keyboard operable, focus returns to the opener) with the "Skip dice animation" toggle bound to `DicePrefs`; add a settings button (`settings.open`) to `table.ts` reachable during an active game. The host-only fast-dice control is added in T027.
- [ ] T017 [P] [US2] Tests: extend `apps/frontend/src/app/table/table.spec.ts` (fake timers): after a throw the thrown dice show no final value until their deadline then show it; actions disabled while rolling; skip pref → immediate values and nothing locked; reduced motion → live-region text present and no tumble class; set-aside dice never roll. Add `apps/frontend/src/app/table/settings-dialog.spec.ts` for toggling skip and persistence.

**Checkpoint**: US1 + US2 work. Rolling is visible; log still reveals instantly until US3.

---

## Phase 5: User Story 3 – Outcome revealed only after the roll (P2)

**Goal**: the throw's log entry and toasts (bust, Volle Lotte) appear only after the last die stopped.

**Independent Test**: throw and watch the log and notices: nothing about the result shows until the last die stops; after reload no roll runs and everything is shown.

- [ ] T018 [US3] In `apps/frontend/src/app/table/table.ts` gate the `seen` log cursor: it advances only while `DiceRollService.rolling()` is false; the log renders only entries up to the cursor; the toast mapping (`ANNOUNCED`) is evaluated when the cursor advances. A state arriving mid-roll (turn change, player left) never changes values already shown; the pending entries are flushed when the roll ends.
- [ ] T019 [US3] Reload/reconnect (FR-014): on the first `game:state`/log after load or reconnect set the cursor to the current log length and do not start a roll; make sure a socket reconnect while rolling shows final values without replay. Implement in `table.ts` / `core/socket.service.ts` as needed.
- [ ] T020 [P] [US3] Tests in `apps/frontend/src/app/table/table.spec.ts` (fake timers): while one die is still rolling the "threw" entry and bust toast are absent; after the last die they appear; mid-roll turn-change state is held until the end; initial load with an existing throw entry starts no roll and shows the log at once; skip pref shows the entry immediately.

**Checkpoint**: US1–US3 complete for human throws.

---

## Phase 6: User Story 4 – Follow the computer's moves (P2)

**Goal**: computer waits for the roll, then 3 s, then acts; 2 s between further actions; picked dice are highlighted for humans before being applied; host can enable fast computer dice.

**Independent Test**: play against a computer: dice roll, 3 s pause, picks highlighted for 2 s, then applied; with fast dice on, computer dice stop within 1–2.5 s; a guest sees the setting read-only.

- [ ] T021 [US4] Backend: add `fastComputerDice` (default `false`) and `setFastComputerDice(v)` to `GameRoom` in `apps/backend/src/app/lobby/game-room.ts`; expose it in the game view in `apps/backend/src/app/lobby/view.ts` (replace the temporary value from T002). Setting is not part of `Rules`.
- [ ] T022 [US4] Backend: handle `'game:settings'` in `apps/backend/src/app/lobby/lobby.gateway.ts` following the `turn:preview` pattern (`inRoom(...)`, `bad('invalidRequest')` on a non-boolean payload, `notHost` for non-hosts, reject when the game is finished); on success push `game:state` to the room.
- [ ] T023 [US4] Backend: replace the random computer delay in `scheduleComputer` (`game-room.ts`, currently `COMPUTER_DELAY_MS`) with fixed pacing: after a `thrown` event wait `rollMax + 3000 ms + small margin` (`rollMax` = 5000, or 2500 with `fastComputerDice`), after any other computer action wait 2000 ms. Export the constants for tests.
- [ ] T024 [US4] Backend: computer `select` shows the pick first: set `preview` to the chosen dice and emit `game:state`, then apply the action after 2000 ms (`apply()` resets `preview = []`). Keep the `pending` guards (`setPreview`/`act`) so human intents cannot interleave; make sure a stale timer never applies after the game ended or the room was closed.
- [ ] T025 [P] [US4] Backend tests (fake timers) in `apps/backend/src/app/lobby/game-room.spec.ts`: delay after a throw is 8000+margin / 5500+margin with fast dice, 2000 after other actions; computer select emits `preview` equal to the picked dice 2 s before the select event; `setFastComputerDice` reflected in the view. In `apps/backend/src/app/lobby/lobby.gateway.spec.ts`: host can set, guest gets `notHost`, invalid payload gets `invalidRequest`, state is pushed to the room.
- [ ] T026 [US4] Frontend: add `settings(fastComputerDice: boolean)` to `apps/frontend/src/app/core/socket.service.ts` (emit `game:settings`, same ack/error handling as other intents) and expose the current value from the `GameView`.
- [ ] T027 [US4] Frontend: extend `settings-dialog.ts` with the "Fast computer dice" toggle: editable for the host (calls `SocketService.settings`), read-only for guests with the `settings.hostOnly` hint.
- [ ] T028 [US4] Frontend: pass `computerFast = thrower is computer && game.fastComputerDice` into `DiceRollService.start` in `table.ts`; show computer picks (`game.preview` while it is a computer's turn) with the same selected-die cue plus a small computer badge (`dice.computerPick`) in `dice-tile.ts` via a `computerPick` input.
- [ ] T029 [P] [US4] Frontend tests: `table.spec.ts` (computer preview highlights dice and shows the badge on a human's table; fast computer dice uses the 1–2.5 s range), `settings-dialog.spec.ts` (host toggle emits `game:settings`, guest toggle disabled), `socket.service.spec.ts` (settings emits the intent).

**Checkpoint**: all four stories work.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T030 [P] Update EN/DE documentation (paired files): `README` feature notes if dice are mentioned, `docs/user-guide*.md` (pips, rolling, skip setting, fast computer dice, reduced motion), `docs/how-to-play*.md` if it mentions dice display; update `docs/migration.md` status if the porting map lists dice UI. Use the repo's docs skill for the EN/DE pairing.
- [ ] T031 Check `sonar.coverage.exclusions` and the skip list in `.specify/memory/test-coverage-guide.md`: no new exclusions are needed unless `settings-dialog.ts` is template-only; keep both in sync if added. Run coverage and confirm ≥ 80 % for the touched projects.
- [ ] T032 Run `npm run typecheck && npm run test && npm run lint` and fix findings.
- [ ] T033 Run the manual scenarios in `specs/005-dice-pips-rolling-animation/quickstart.md` (desktop and phone width, light and dark, reduced motion, skip setting, host and guest, reload mid-roll) and note any deviation.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. Within Phase 2: T002 first, T003/T004/T005 parallel (T005 after T004).
- **US1** after Phase 2; no dependency on other stories (MVP).
- **US2** after Phase 2; uses `DieFace`/`DiceTile` from US1 (T006, T008) for the table binding, so run it after US1 in practice (T010–T012 can start in parallel with US1).
- **US3** depends on US2 (`DiceRollService.rolling`).
- **US4** backend (T021–T025) is independent of the frontend stories and can run in parallel with US1–US3 after T002; frontend T026–T029 depend on US2 (settings dialog, roll service).
- Polish after all desired stories.

### Parallel opportunities

- After T002: T003, T004 (then T005).
- US1: T007 with T006; T009 after T006–T008.
- US2: T010, T011, T012 in parallel; T017 after T013–T016.
- US4 backend (T021–T025) alongside US2/US3 frontend work by a second developer.
- Polish: T030 with T031.

## Implementation Strategy

1. **MVP**: Phase 1, Phase 2, US1 (pips + selection cue). Stop and validate (quickstart scenario 1).
2. Add US2 (rolling, skip, reduced motion), validate; add US3 (reveal gating) right after, because the animation is spoiled without it.
3. Add US4 (computer pacing, pick highlight, fast dice), then Polish.
4. Each story ends with its tests green; commit per task or logical group (Conventional Commits).

## Notes

- Server values, rules and `libs/game-rules` engine logic are unchanged; only `protocol.ts` types and the protocol version change.
- Never let the animation alter or send a value (Constitution I): the final shown value always comes from the server state.
- Verify tests fail first where practical, then implement.
