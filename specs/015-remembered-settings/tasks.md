---
description: 'Task list for remembered settings and presets'
---

# Tasks: Remembered Settings and Presets

**Input**: Design documents from `/specs/015-remembered-settings/`

**Prerequisites**: plan.md, spec.md, design.md, research.md, data-model.md, contracts/local-storage.md

**Tests**: Test work is included: the constitution requires tests for new logic in the same change. Specs use Vitest (`vi.fn`, helpers in `apps/frontend/src/app/core/testing.ts`).

**Organization**: Tasks are grouped by user story. US1 is the MVP (the next game starts with the last setup); US2 adds presets; US3 adds "Reset to defaults"; US4 adds the question on "Start game". The feature is frontend only: no backend, protocol or `libs/game-rules` change.

## Phase 1: Foundational

**Purpose**: Pure logic, the storage service and the helper that applies a setup to a room. All stories use them (data-model.md, contracts/local-storage.md).

**⚠️ CRITICAL**: Complete this phase before the user stories.

- [x] T001 Create `apps/frontend/src/app/core/setup.ts` per `data-model.md`: types `ComputerSeat { seat; difficulty; risk }` and `Setup { seats; rules; computers; speed }`; constants `MAX_PRESETS = 10`, `MAX_PRESET_NAME = 30`; `defaultSetup()` (4 seats, `defaultRules()`, no computers, speed 3); `sanitizeSetup(value: unknown): Setup` with per-field fallback ("seats clamped to 2 to 8 else 4", rules built on `defaultRules()` with each known field a finite integer in range and the result checked with `rulesError`, else defaults; "speed an integer 1 to 5 else 3"; computers filtered to known `difficulty` and `risk` values, `seat` in 1 to `seats - 1`, unique, at most `seats - 1`); `setupsEqual(a, b)` (seats, rules field by field including all card counts, speed, computers sorted by seat; names ignored); `setupFromGame(game: GameView): Setup` (seats from `game.seats.length`, `rules`, computers from seats in state `computer` with their index, `difficulty ?? 'medium'`, `risk ?? 'medium'`, `speed` from `computerSpeed`); `describeSetup(setup)` returning the numbers used by the summary text (seats, target score, computer count, speed); `planComputers(seats: SeatView[], computers: ComputerSeat[]): { clear: number[]; place: { seat; difficulty; risk }[]; skipped: number }` that frees the seats of existing computers, puts each computer on its stored seat if that seat is open, else on the first open seat (never seat 0 and never a human, reserved or locked seat), and counts the computers that did not fit
- [x] T002 [P] Add `apps/frontend/src/app/core/setup.spec.ts`: defaults; `sanitizeSetup` with garbage, `null`, `seats: 99`, a card count `-1` and `1e9`, an unknown skill, duplicate and out-of-range seats, too many computers, partly valid data keeping the valid parts, a missing new option falling back to its default; `setupsEqual` ignoring computer names and order; `setupFromGame` from a lobby view with two computers; `planComputers` for a fresh room (layout restored exactly), a stored seat taken by a human (first-fit), more computers than free seats (`skipped`), replaced existing computers counting as free, host seat never used
- [x] T003 Create `apps/frontend/src/app/core/setup-store.ts` (`@Injectable({ providedIn: 'root' })`) per `contracts/local-storage.md`: keys `vl-last-setup` (`{ v: 1, setup }`) and `vl-presets` (`{ v: 1, items: [{ name, setup }] }`); signals `last: Setup | null`, `presets: Preset[]`, `available`, `reference: Setup | null` (in memory only); reading wrapped in try/catch, invalid JSON, wrong shape or `v` other than 1 treated as missing, every setup passed through `sanitizeSetup`, preset names trimmed, invalid names dropped, duplicates (ignoring case) keep the first, list cut to `MAX_PRESETS`; methods `saveLast(setup)`, `resetLast()` (removes the key), `savePreset(name, setup, replace = false): 'ok' | 'exists' | 'full' | 'name' | 'storage'` (name trimmed, "1 to 30 characters", unique ignoring case; `exists` without `replace`; `full` when 10 presets and the name is new), `deletePreset(name)`, `hasPreset(name)`, `setReference(setup | null)`; writes in try/catch, a failure sets `available` to false and returns `storage`; never touches any other key and never stores a game name or password
- [x] T004 [P] Add `apps/frontend/src/app/core/setup-store.spec.ts` (stub `localStorage` with `vi.stubGlobal`): empty, corrupt, wrong-version and valid reads; `last` and `presets` survive a new instance; `savePreset` result for new, same name in other case (`exists`), replace, 31 characters, empty and spaces-only names (`name`), the 11th preset (`full`) while replacing at 10 still works; `deletePreset` leaves `last` and the other presets alone; `resetLast` keeps presets; a throwing `setItem` gives `storage` and `available` false and the in-memory value still works; a newer `v` is ignored and not overwritten by a read
- [x] T005 Create `apps/frontend/src/app/core/setup-apply.ts`: `applySetup(socket, game, computers, speed?)` that runs `planComputers` on `game.seats`, then sends `seat:set` with `mode: 'open'` for each seat to clear, `seat:set` with `mode: 'computer'`, `difficulty`, `risk` for each placed computer, and `game:settings` with `computerSpeed` when `speed` is given, one after another; stops at the first failed ack and returns `{ ok: true, placed, skipped } | { ok: false, ack }` (error text is shown by the caller with the existing `errorMessage`)
- [x] T006 [P] Add `apps/frontend/src/app/core/setup-apply.spec.ts` with the socket stub from `core/testing.ts`: the sends happen in order, a full fit reports `skipped: 0`, a partial fit reports the skipped count and sends nothing for them, a failing `seat:set` stops the run and returns the ack, no speed means no `game:settings`

**Checkpoint**: Setup logic, storage and apply helper are tested and ready.

---

## Phase 2: User Story 1 - The next game starts with my last setup (Priority: P1) 🎯 MVP

**Goal**: The create-game page is prefilled from the last started game and the new lobby gets its computers and speed; the nickname stays remembered.

**Independent Test**: Create a game with 6 seats, a changed target score and two computers with a changed speed, and start it. Open the create-game page: 6 seats and the changed rules are prefilled and an info line lists the computers. Create the game: the lobby shows the two computers and the speed. A fresh device shows the defaults.

- [x] T007 [US1] Update `apps/frontend/src/app/create-game/create-game.ts`: inject `SetupStore`; initialise `seats`, `targetScore`, `minimumPoints`, `doubling`, `counts` from `store.last` (else `defaultSetup()`); add signals `pendingComputers` and `pendingSpeed` from the last setup (computers beyond `seats - 1` are ignored when the seat count changes); add the info line from design.md ("Remembered computers are added to the lobby after you create the game: …" with `describeSetup`) shown only when there are pending computers; after `socket.create` succeeds and before navigating, call `applySetup(socket, ack.game, pendingComputers(), pendingSpeed())` as best effort (a failed step is not shown; the lobby shows what was applied, and the game opens either way); the game name and the password stay out of every stored value
- [x] T008 [US1] Save the last setup in `apps/frontend/src/app/game-lobby/game-lobby.ts`: in `start()`, after `game:start` returns `ok`, call `store.saveLast(setupFromGame(game))` using the game view from before the start (only the host calls it); a failed start saves nothing
- [x] T009 [P] [US1] Add English and German texts in `apps/frontend/src/app/i18n/en.ts` and `apps/frontend/src/app/i18n/de.ts`: `create.pendingComputers` (info line with `{count}`, `{speed}`), `create.prefilled`, `create.prefilledHint` ("Seats, rules and computers. Game name and password are never remembered."); German without gender-inclusive forms (CLAUDE.md)
- [x] T010 [P] [US1] Extend `apps/frontend/src/app/create-game/create-game.spec.ts`: defaults without a stored setup; prefill from a stored setup (seats, target score, card counts); the info line appears only with pending computers; submit calls `applySetup` with the pending computers and speed after `create` succeeded; submit still navigates when `applySetup` fails; neither the name nor the password reaches `store.saveLast` or `localStorage`
- [x] T011 [P] [US1] Extend `apps/frontend/src/app/game-lobby/game-lobby.spec.ts`: a successful start saves the current setup as the last setup (seats, rules, computers by seat, speed); a failed start saves nothing; a non-host never saves
- [x] T012 [P] [US1] Add a test in `apps/frontend/src/app/nickname/nickname.spec.ts`: the nickname page shows the stored nickname (existing behaviour, FR-001); no production change

**Checkpoint**: US1 works alone: the next game starts with the last setup.

---

## Phase 3: User Story 2 - Save and load a named preset (Priority: P2)

**Goal**: One shared preset list per device with save, load, apply and delete, on the create-game page and in the lobby.

**Independent Test**: On the create page set 8 seats and target 3000, save "Friday". Change the values, load "Friday": all values return at once. In a lobby with one human, apply a preset with too many computers: the message names how many did not fit. Delete "Friday": it disappears.

- [x] T013 [P] [US2] Create `apps/frontend/src/app/shared/preset-save-dialog.ts` (PrimeNG Dialog like `table/settings-dialog.ts`): inputs `visible`, `setup`; name input `maxlength="30"` with a character counter, 44px targets; Save calls `store.savePreset`; shows the overwrite warning with "Replace preset" on `exists`, the limit message on `full` (Save disabled, hint to delete one in "Load preset" or reuse an existing name), `name` errors inline and the "settings cannot be saved on this device" message on `storage`; outputs `saved(name)` and `closed`; focus moves into the dialog and back to the trigger on close
- [x] T014 [P] [US2] Create `apps/frontend/src/app/shared/preset-list-dialog.ts`: inputs `visible`, `mode: 'create' | 'lobby'`; lists `store.presets()` with name and summary from `describeSetup` (in lobby mode only computers and speed are described, with the unused parts marked as not applied), a Load (create) or Apply (lobby) button and a delete icon button with `aria-label`; delete shows the inline "Delete? Keep" confirmation from the mockup; empty state text; counter "{count} of 10 presets"; output `chosen(preset)`; Escape and the Close button close it
- [x] T015 [US2] Create `apps/frontend/src/app/shared/preset-bar.ts`: the bar from `design.md` with "Load preset" and "Save as preset" buttons (both disabled with the notice text when `store.available()` is false), an optional projected slot for "Reset to defaults", inputs `mode` and `current: () => Setup`, output `loaded(preset)`; owns the two dialogs; after a successful lobby save it calls `store.setReference(saved setup)`; PrimeNG Button with the existing `severity="secondary"` style
- [x] T016 [US2] Wire the bar into `apps/frontend/src/app/create-game/create-game.ts`: `current` builds a `Setup` from the form values plus `pendingComputers` and `pendingSpeed` (snapshot, FR-007); `loaded` replaces seats, rules, counts, pending computers and speed at once and calls `store.setReference(preset.setup)`; the bar shows the "Prefilled from your last game" text only when a last setup exists
- [x] T017 [US2] Wire the bar into `apps/frontend/src/app/game-lobby/game-lobby.ts`: host only and only while `phase` is `lobby` (FR-019); `current` is `setupFromGame(game)`; `loaded` runs `applySetup(socket, game, preset.setup.computers, preset.setup.speed)`, sets `store.setReference(preset.setup)`, and sets a `presetMessage` signal: success text "Preset {name} applied: {placed} computers added" and, when `skipped > 0`, the warning "… {skipped} did not fit and was skipped. Seated players were not changed."; errors use `errorMessage`
- [x] T018 [P] [US2] Add English and German texts: `preset.load`, `preset.save`, `preset.bar.lobbyHint`, `preset.dialog.loadTitle`, `preset.dialog.loadHintCreate`, `preset.dialog.loadHintLobby`, `preset.apply`, `preset.delete`, `preset.deleteConfirm`, `preset.keep`, `preset.empty`, `preset.count`, `preset.summary` and lobby summary variants, `preset.saveTitle`, `preset.saveHint`, `preset.name`, `preset.nameCount`, `preset.nameError`, `preset.exists`, `preset.replace`, `preset.full`, `preset.storageBlocked`, `preset.storageBlockedHint`, `preset.applied`, `preset.appliedSkipped` in `apps/frontend/src/app/i18n/en.ts` and `de.ts` (the existing `i18n.spec.ts` checks keys and placeholders match)
- [x] T019 [P] [US2] Add `apps/frontend/src/app/shared/preset-save-dialog.spec.ts`: saving a new name, the overwrite flow (warning, then replace), the limit message with Save disabled, a name of 31 characters and a blank name rejected, the storage-blocked message, the counter text
- [x] T020 [P] [US2] Add `apps/frontend/src/app/shared/preset-list-dialog.spec.ts`: the list shows name and summary, the empty state, load emits the preset, delete asks first and Keep cancels, delete removes only that preset, lobby mode labels the button "Apply" and marks unused parts, Escape closes
- [x] T021 [P] [US2] Extend `apps/frontend/src/app/create-game/create-game.spec.ts` and `apps/frontend/src/app/game-lobby/game-lobby.spec.ts`: loading a preset replaces all form values and pending computers at once; a preset saved after the form was changed again is a snapshot and later edits do not change it; in the lobby applying a preset replaces the computers, keeps seated humans, shows the "did not fit" warning, and the bar is hidden for non-hosts and outside the lobby phase; with blocked storage both buttons are disabled and the form still works
- [x] T022 [P] [US2] Add `apps/frontend/src/app/shared/preset-bar.spec.ts`: both pages share the same list (a preset saved in lobby mode shows in the create-mode dialog), lobby save stores the complete room setup (seats and rules too), a lobby save sets the reference

**Checkpoint**: US2 works: presets can be saved, loaded, applied and deleted on both pages.

---

## Phase 4: User Story 3 - Go back to the defaults (Priority: P3)

**Goal**: "Reset to defaults" on the create-game page.

**Independent Test**: Change several options and press "Reset to defaults": all fields show the defaults, the next lobby has no computers and speed 3, and presets remain.

- [x] T023 [US3] Add the "Reset to defaults" button to `apps/frontend/src/app/create-game/create-game.ts` (projected into the preset bar slot): sets `seats`, rules, `counts` and `doubling` from `defaultSetup()`, clears `pendingComputers`, sets `pendingSpeed` to 3, calls `store.resetLast()` and leaves the name, the password and all presets untouched
- [x] T024 [P] [US3] Add English and German text `preset.reset` in `apps/frontend/src/app/i18n/en.ts` and `de.ts`
- [x] T025 [P] [US3] Extend `apps/frontend/src/app/create-game/create-game.spec.ts`: after a reset all values equal the defaults, no computers are applied on submit, `vl-last-setup` is removed, presets stay available, the game name and password stay as typed

**Checkpoint**: US3 works: one click returns to the defaults.

---

## Phase 5: User Story 4 - Offer to save a new setup when starting (Priority: P3)

**Goal**: A question on "Start game" when the setup is not known to be saved.

**Independent Test**: Start a changed setup: the question appears; "No, start the game" starts. Load a preset and start unchanged: no question. Change a computer and start: the question appears. Replay the last setup: no question.

- [x] T026 [US4] Add `apps/frontend/src/app/game-lobby/start-question-dialog.ts`: PrimeNG Dialog titled by `startQuestion.title` with the setup summary and three buttons from `design.md`: "Back to lobby" (closes, no start), "No, start the game", "Save as preset" (opens `preset-save-dialog`; a successful save starts the game, cancel returns to the question); outputs `start` and `back`
- [x] T027 [US4] Update `start()` in `apps/frontend/src/app/game-lobby/game-lobby.ts`: compute `current = setupFromGame(game)`; ask only if `store.available() && !setupsEqual(current, store.reference()) && !setupsEqual(current, store.last())` (null references never equal); otherwise start as in T008; "No, start the game" calls `store.setReference(current)` and starts; a saved preset (via the question) sets the reference through `preset-save-dialog`/`preset-bar` logic and starts; the question is never shown to a non-host
- [x] T028 [P] [US4] Add English and German texts `startQuestion.title`, `startQuestion.text`, `startQuestion.no`, `startQuestion.save`, `startQuestion.back` in `apps/frontend/src/app/i18n/en.ts` and `de.ts`
- [x] T029 [P] [US4] Add `apps/frontend/src/app/game-lobby/start-question-dialog.spec.ts` and extend `game-lobby.spec.ts`: question for a setup without reference and last; none for an unchanged loaded preset (reference), none for the unchanged last setup, none when storage is unavailable; one changed computer, speed or rule after loading a preset brings the question back; "No, start the game" starts and the same unchanged setup (also after a rematch) is not asked again; "Save as preset" saves then starts, cancelling the save dialog returns to the question, "Back to lobby" does not start and does not save anything

**Checkpoint**: US4 works: the question appears only for setups that are not known.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, quality gates and one real-browser check.

- [x] T030 [P] Update `docs/user-guide.md` and `docs/user-guide.de.md`: section on remembered settings and presets (what is remembered and what is not, device-only, "Load preset" and "Save as preset" on the create page and in the lobby, applying a preset in the lobby, deleting, limit of 10, "Reset to defaults", the start question); German without gender-inclusive forms
- [x] T031 [P] Update `docs/roadmap.md`: set R10 to `done` (status line and the open question answered: reset button included), add a row for spec 015 in the done table in the format of the 014 row
- [x] T032 Run `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build` and fix findings; confirm the per-project coverage stays at or above 80% and no new entry is needed in the coverage skip list
- [x] T033 Verify the UI once with the `verify-ui` skill (Playwright): the scenarios 1 to 10 of `quickstart.md` on desktop and phone width, light and dark, including blocked storage and the damaged-data cases; fix visible problems
- [x] T034 Review the German texts in `apps/frontend/src/app/i18n/de.ts` and `docs/*.de.md` for gender-inclusive forms (CLAUDE.md) and the new English texts for consistency with the mockup wording

---

## Dependencies & Execution Order

- **Phase 1** blocks everything. Inside it: T001 then T003 and T005; T002, T004 and T006 follow their module and run in parallel.
- **US1** (T007 to T012) depends on Phase 1 only and is the MVP.
- **US2** (T013 to T022) depends on Phase 1; T015 needs T013 and T014; T016 and T017 need T015. US2 does not need US1 code but both edit `create-game.ts` and `game-lobby.ts`, so run them in order.
- **US3** (T023 to T025) needs T015 (the bar slot) and T007.
- **US4** (T026 to T029) needs T008 (last setup) and US2 (the save dialog and the reference).
- **Polish** (T030 to T034) after the stories it describes; T032 and T033 last.

## Parallel Opportunities

- After T001: T002 in parallel with T003; after T003: T004 and T005; T006 after T005.
- US1: T009, T010, T011, T012 in parallel after T007 and T008.
- US2: T013, T014 and T018 in parallel; T019, T020, T021 and T022 in parallel after their components.
- Polish: T030 and T031 in parallel.

## Implementation Strategy

1. Phase 1, then US1 as the MVP: remembered values already remove the repeated typing. Validate with the US1 test and scenarios 1 to 3 of `quickstart.md`.
2. US2 next (presets), then US3 and US4, each independently testable.
3. Polish: documentation, quality gates, one browser check.
