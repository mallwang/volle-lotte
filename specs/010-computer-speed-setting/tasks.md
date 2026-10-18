---
description: 'Task list for 010 Computer Player Speed Setting'
---

# Tasks: Computer Player Speed Setting

**Input**: Design documents from `/specs/010-computer-speed-setting/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/protocol.md](contracts/protocol.md), [quickstart.md](quickstart.md), [design.md](design.md)

**Tests**: Included for all new logic (constitution III): Jest in backend and `libs/game-rules`, Vitest in the frontend, axe checks for the new component. Browser behaviour is verified with a throw-away Playwright script (skill `verify-ui`), not a permanent suite.

**Organization**: Grouped by user story. Paths are repository-relative. Do not change the rules engine, the human turn limits (`TURN_LIMIT_MS`), the client dice roll durations (`dice-roll.ts`) or the `fastComputerDice` behaviour (FR-015, FR-008).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task)
- **[Story]**: US1 faster default pace, US2 host slider, US3 setting toast

---

## Phase 1: Setup

- [x] T001 Load the PrimeNG guidance for `slider` and `toggleswitch` once (skill `primeng:primeng-component-implementation`, MCP `get_component`) and check the installed PrimeNG version: `ariaLabelledBy`/`ariaLabel` support, keyboard steps with `step=1`, whether `onSlideEnd` fires on keyboard changes, disabled styling. Record any difference from [research.md](research.md) R7/R8 in the PR description draft only

---

## Phase 2: Foundational (blocks all stories)

- [x] T002 [P] Create `libs/game-rules/src/lib/pacing.ts`: export `COMPUTER_SPEEDS` (`[1, 2, 3, 4, 5]`), `DEFAULT_SPEED = 3`, `isComputerSpeed(x: unknown): x is number` (integer in 1..5), `interface Pacing { pauseMs; afterRollMs; noticeMs }` and `pacing(step: number): Pacing` using the table of [research.md](research.md) R2 (1: 3000/4500/8000, 2: 2000/3250/6000, 3: 1200/1500/3500, 4: 700/800/2500, 5: 400/400/1500); any invalid input returns the `DEFAULT_SPEED` row. Export from `libs/game-rules/src/index.ts`. Pure function, no I/O
- [x] T003 [P] Create `libs/game-rules/src/lib/pacing.spec.ts`: each column strictly decreases from step 1 to 5; step 2 equals the legacy values (2000, 3250, 6000); invalid input (0, 6, 2.5, `'3'`, `NaN`, `undefined`) gives the default row; modelled computer turn (notice + draw + throw + select + throw + select + bank, with roll maximum 3000 and highlight = `pauseMs`) at step 3 is at least 25% shorter than at step 2 (SC-001) and at step 5 below a third of step 1 (SC-002)
- [x] T004 Update `libs/game-rules/src/lib/protocol.ts` per [contracts/protocol.md](contracts/protocol.md): `PROTOCOL_VERSION = 5`; `GameView.computerSpeed: number`; `Intents['game:settings']` payload `{ fastComputerDice?: boolean; computerSpeed?: number }`; add `SettingChange` (`{ setting: 'computerSpeed' | 'fastComputerDice'; value: number | boolean }`) and `Pushes['game:settingsChanged']: { by: string; changes: SettingChange[] }`. Update the doc comment of `fastComputerDice` (dice roll only)
- [x] T005 [P] Update the frontend test helpers in `apps/frontend/src/app/core/testing.ts`: `gameView()` gets `computerSpeed: 3`; keep `stubSocket().settings` as `vi.fn()`. Fix every typecheck error this causes in existing specs (only the added field)

**Checkpoint**: shared contract and pacing table exist; `npm run typecheck` shows only expected errors in backend/frontend code that T006 onwards fixes.

---

## Phase 3: User Story 1 - Faster computer players by default (Priority: P1) MVP

**Goal**: all computer waits come from the pacing table; a new game runs at step 3, clearly faster than today.

**Independent Test**: [quickstart.md](quickstart.md) section 3 step 6 and 4 (default pace) and the pacing model test (T003); backend timers advance by the step 3 values.

- [x] T006 [US1] In `apps/backend/src/app/lobby/game-room.ts` add `computerSpeed = DEFAULT_SPEED` (public, next to `fastComputerDice`) and replace the constants `COMPUTER_PAUSE_MS`, `AFTER_ROLL_MS` and `NOTICE_MS` by `pacing(this.computerSpeed)` in `apply()` (computer delay: `thrown ? rollMax + afterRollMs : pauseMs`, plus `noticeMs` when a turn ended), in the pick highlight timer of `scheduleComputer()` (`pauseMs`) and in `turnExpired()` (`pauseMs + noticeMs`, `noticeMs`). Keep `ROLL_MAX_MS`/`ROLL_MAX_FAST_MS` unchanged. For the human limit (`turnDelay`) keep the fixed margin `ROLL_MAX_MS + 3250` after a throw (FR-013, [research.md](research.md) R4) and use the scaled `noticeMs`; update the doc comments
- [x] T007 [P] [US1] In `apps/backend/src/app/lobby/view.ts` add `computerSpeed: room.computerSpeed` to the `GameView`
- [x] T008 [US1] Update `apps/backend/src/app/lobby/game-room.spec.ts`: the pacing tests (`waits for the dice to stop before the computer acts, else 2 s`, the 6 s notice test, the highlight test) compute their delays from `pacing(DEFAULT_SPEED)`; add a test that a room with `computerSpeed = 2` still uses the legacy values; add a test that the human limit starts after the scaled notice plus the fixed dice margin (FR-013); `toView` includes `computerSpeed: 3` by default. Check `lobby.gateway.e2e.spec.ts` for timing assumptions and adapt (no behaviour change expected)
- [x] T009 [US1] In `apps/frontend/src/app/table/table.ts` remove the `NOTICE_MS` constant; derive the notice length from `pacing(game.computerSpeed).noticeMs` (a `computed` read when a notice starts) and use it for the toast `life`, the `setTimeout` that clears the notice and the `[waitMs]` binding (replace `protected readonly NOTICE_MS`). Update the comment that pointed at `NOTICE_MS` in `game-room.ts`. Adapt `table.spec.ts` (notice length at the default step, and a case with `computerSpeed: 5`)

**Checkpoint**: US1 works alone: new games are faster, nothing is configurable yet.

---

## Phase 4: User Story 2 - Host chooses the computer speed (Priority: P1)

**Goal**: the host sets the speed in the lobby and the running game; guests see it read-only; every game starts at 3.

**Independent Test**: [quickstart.md](quickstart.md) sections 2 and 3 (steps 1 to 3 and 6).

- [x] T010 [US2] In `apps/backend/src/app/lobby/game-room.ts` change `setSettings(playerId, patch)` to take `{ fastComputerDice?: boolean; computerSpeed?: number }` and return `Res<{ changes: SettingChange[] }>`: `notHost` when `playerId !== hostId`, `notInGame` when `phase === 'finished'`, `invalidRequest` when `computerSpeed` is not an integer in 1..5 (use `isComputerSpeed`); apply only fields whose value differs; `changes` lists the real changes (empty = no state change, no `emit()`); `emit()` once when something changed. Allowed in `lobby` and `running`
- [x] T011 [US2] In the same file re-arm the pending computer timer when `computerSpeed` changed ([research.md](research.md) R5): store `computerStartedAt` (via `this.now()`) and a `delayFor(pacing)` function with the pending timer (also for the pick-highlight timer); on a change clear the timer and set a new one for `max(0, delayFor(newPacing) - elapsed)`; keep the `stillMine()` guard so no step runs twice or is skipped; do not touch `turnTimer`
- [x] T012 [US2] In `apps/backend/src/app/lobby/lobby.gateway.ts` change the `game:settings` handler: accept a body with `fastComputerDice` (boolean) and/or `computerSpeed` (integer 1..5); at least one field required; wrong type or out of range gives `invalidRequest` (no session: `noSession`); call `room.setSettings(session.playerId, patch)`; the push of the changes is added in T019
- [x] T013 [US2] Backend tests in `game-room.spec.ts`: host-only (`notHost`), `notInGame` after finish, `invalidRequest` for 0, 6, 2.5, `'3'`; allowed in lobby and running; no-op change returns empty `changes` and does not `emit`; `computerSpeed` appears in `toView` for every player; a new room starts at 3 (FR-006); with fake timers a pending computer step at step 1 fires earlier after switching to step 5 and fires exactly once; a switch during the pick highlight neither skips nor repeats the pick. In `lobby.gateway.spec.ts` extend the `game settings` block: payload validation (empty object, wrong types, speed 0/6), non-host rejected, view reflects the value
- [x] T014 [P] [US2] In `apps/frontend/src/app/core/socket.service.ts` change `settings(fastComputerDice: boolean)` to `settings(patch: { fastComputerDice?: boolean; computerSpeed?: number })` and send `game:settings` with the patch; update `socket.service.spec.ts` (`sends the host setting as game:settings` for both fields)
- [x] T015 [P] [US2] Add i18n keys to `apps/frontend/src/app/i18n/en.ts` and `de.ts`: `settings.computerSpeed` ("Computer speed" / "Computer-Geschwindigkeit"), `settings.computerSpeedHint` ("How long computers wait between their actions. Applies to everyone at the table." and a German equivalent), `settings.computerSpeedValue` (`{step} · {name}`), `settings.computerSpeed.1` to `.5` (Very slow, Slow, Medium, Fast, Very fast / Sehr langsam, Langsam, Mittel, Schnell, Sehr schnell), scale labels `settings.scaleSlow`, `settings.scaleDefault`, `settings.scaleFast`, `gameLobby.settings` ("Game settings" / "Spieleinstellungen"). Keep the existing `settings.fastComputerDice*` and `settings.hostOnly` keys. The i18n parity test must stay green
- [x] T016 [US2] Create `apps/frontend/src/app/shared/host-settings.ts` (standalone `HostSettings`, selector `app-host-settings`): shows the speed slider (`p-slider`, min 1, max 5, step 1, accessible name from `settings.computerSpeed`, current value text "3 · Medium" next to the label, scale labels under the track as in [design.md](design.md)) and the "Fast computer dice" `p-toggleswitch`, both bound to `socket.game()` and disabled with the hint `settings.hostOnly` when the player is not the host (reuse the `isHost` rule of the dialog). The slider keeps a local value while dragging and sends `socket.settings({ computerSpeed })` 300 ms after the last change ([research.md](research.md) R7); it follows the server value when no send is pending. Honour the T001 findings for keyboard and ARIA
- [x] T017 [US2] Create `apps/frontend/src/app/shared/host-settings.spec.ts`: renders the view value, host sees enabled controls, guest sees disabled controls plus hint, a burst of slider changes sends exactly one `settings({ computerSpeed })` with the final value after 300 ms (fake timers), the fast dice switch sends `settings({ fastComputerDice })`, follows a changed server value, axe has no violations in both themes (`expectNoA11yViolations`, `inBothModes`)
- [x] T018 [US2] Add the settings panel to `apps/frontend/src/app/game-lobby/game-lobby.ts`: a `<section>` with heading `gameLobby.settings` and `<app-host-settings>` between the seat list and the action buttons; update `game-lobby.spec.ts` (panel present for host and guest, slider disabled for the guest). In `apps/frontend/src/app/table/settings-dialog.ts` replace the inline fast-dice block by `<app-host-settings>` (keep the local "skip dice animation" switch and subtitle); update `settings-dialog.spec.ts`. The a11y specs of lobby and table must stay green

**Checkpoint**: US1 and US2 work: the host controls the pace in lobby and game; no toast yet.

---

## Phase 5: User Story 3 - Toast when the host changes a setting (Priority: P2)

**Goal**: every human in the game sees one toast per accepted setting change, for the speed and for fast dice, in lobby and at the table.

**Independent Test**: [quickstart.md](quickstart.md) section 2 step 3 and section 3 steps 2, 4, 5.

- [x] T019 [US3] In `lobby.gateway.ts` after a successful `game:settings` whose `changes` is non-empty, emit `game:settingsChanged { by: <host nickname>, changes }` to every human seated in the room (host included) with the existing `emitTo`/`watchers` pattern of `push()`; nothing for an empty `changes`; do not store it. Gateway test: two clients, host changes the speed, both receive exactly one `game:settingsChanged` with the final value; a no-op change and a rejected change send none; a player who joins or rejoins afterwards receives none
- [x] T020 [P] [US3] Add i18n keys to `en.ts`/`de.ts`: `toast.setting.computerSpeed` ("{who} set the computer speed to {step} ({name})." / German equivalent), `toast.setting.fastComputerDice.on` and `.off` ("{who} turned fast computer dice on." / "off."), and a German equivalent of each. Parity test stays green
- [x] T021 [US3] In `apps/frontend/src/app/core/socket.service.ts` handle the `game:settingsChanged` push: for each change add one `MessageService` toast (severity `info`, `life: 4000`, text from T020, step name from `settings.computerSpeed.<n>`). Add tests to `socket.service.spec.ts`: one toast per change entry, texts in the current language, none without a push; a `game:state` push alone shows no toast (FR-012)

**Checkpoint**: all three stories work.

---

## Phase 6: Polish & Cross-Cutting

- [x] T022 [P] Update `docs/user-guide.md`: Settings section (computer speed slider, host only, default Medium, applies to everyone, shown in lobby and table, toast on changes, "Fast computer dice" unchanged), the computer pacing sentence (pick highlight, notice length now depend on the speed), and fix the dice timing numbers to match `dice-roll.ts` (1-3 s normal, 0.5-1.5 s fast)
- [x] T023 [P] Update `docs/roadmap.md`: add spec 010 to the Done table (one line: computer speed slider 1-5, default 3, setting toast, protocol v5) and bump "Last updated"
- [ ] T024 Run `/speckit-docs-update` for READMEs and user docs touched by this feature
- [x] T025 Run `npm run lint && npm run typecheck && npm run test` and fix findings; confirm the backend e2e flows still pass manually with `npm run test:e2e` (skill `run-e2e`)
- [x] T026 Verify in the real app with the `verify-ui` skill following [quickstart.md](quickstart.md) sections 2 to 4 (two browser contexts: host and guest); check light and dark, keyboard operation of the slider, one toast per drag, reschedule when moving from 1 to 5, no toast on late join; remove any throw-away script afterwards
- [ ] T027 Run `/speckit-sonar-local` (or `/speckit-sonar-validate` on the PR) and fix new issues; confirm coverage of new files (`pacing.ts`, `host-settings.ts`) per `.specify/memory/test-coverage-guide.md`

---

## Dependencies & Execution Order

- Phase 1 has no dependency; Phase 2 blocks everything (T004 needs the types of T002; T005 needs T004).
- US1 (T006 to T009) depends on Phase 2 only. T007 is parallel to T006; T008 follows T006/T007; T009 is frontend-only and parallel to T006 to T008.
- US2 (T010 to T018) depends on Phase 2; T010/T011/T012 share files with T006 (`game-room.ts`) and should follow US1 in the same branch. T014 and T015 are parallel to the backend tasks; T016 needs T014 and T015; T017 follows T016; T018 follows T016.
- US3 (T019 to T021) depends on T010 and T012 (the `changes` result) and on T014 for the shared service file; T020 is parallel.
- Polish follows all stories; T022 and T023 are parallel.

### Parallel examples

- Phase 2: T002 and T003 together, then T004, then T005.
- After US1: T014 and T015 and the backend chain T010 to T013 in parallel.
- US3: T019 (backend) and T020 (i18n) in parallel, then T021.

## Implementation Strategy

- **MVP**: Phase 1, 2 and US1 (T001 to T009). It already removes the main complaint (waits) and ships a faster default; the table is faster for everyone with no new UI.
- **Increment 2**: US2 gives the host control. **Increment 3**: US3 adds the toasts.
- Each phase ends green on `npm run lint && npm run typecheck && npm run test` before the next one starts.
