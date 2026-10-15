---
description: 'Task list for UI Foundation (PrimeNG)'
---

# Tasks: UI Foundation

**Input**: Design documents from `/specs/003-ui-foundation-primeng/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md, design.md

**Tests**: Included. The constitution requires 80% frontend coverage and SC-004 demands automated accessibility checks (`axe-core`) in light and dark mode.

**Organization**: Grouped by user story. Frontend only: no change to `apps/backend` or `libs/game-rules` (FR-018). All paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1-US5); none for Setup, Foundational and Polish

## Phase 1: Setup (Angular 22.1 and PrimeNG 22.1)

**Purpose**: Dependency bump in one step (FR-019, research R1)

- [x] T001 Bump every `@angular/*` package and the Angular CLI/build/devkit packages in `package.json` from `~22.0.4` to `~22.1.x`; add `@angular/cdk` `~22.1.x`, `primeng` `^22.1.2`, `@primeuix/themes`, and dev dependency `axe-core`; run `npm install`
- [x] T002 Verify the toolchain on Angular 22.1: `npm ls @angular/core primeng @angular/cdk`, then `npm run build`, `npm run typecheck`, `npm run test`; if `@nx/angular` 23.1.1 rejects Angular 22.1, bump the Nx packages in the same step (research R1)
- [x] T003 Using Context7 (`primeng` 22.1) confirm the v22 specifics deferred in research.md R6: whether `provideAnimationsAsync` is still required, the `providePrimeNG` option names, and `definePreset` import path from `@primeuix/themes/aura`; note findings at the end of `specs/003-ui-foundation-primeng/research.md`

**Checkpoint**: App builds and all existing tests pass on Angular 22.1 with the new dependencies installed (no UI change yet).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme, shell plumbing and shared tiles every story builds on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Create the Terracotta preset in `apps/frontend/src/app/theme/terracotta-preset.ts` with `definePreset(Aura, ...)`: `semantic.primary` terracotta scale and `colorScheme.light|dark` tokens (`primary.color`, `inverseColor`, `hoverColor`, `activeColor`, `highlight`, `surface`) taken from `specs/003-ui-foundation-primeng/design.md`; export the token pairs used for text/background so the contrast test can read them
- [x] T005 [P] Write the WCAG contrast unit test `apps/frontend/src/app/theme/terracotta-preset.spec.ts`: every text/background token pair in light and dark is >= 4.5:1 (3:1 for large text and UI borders)
- [x] T006 [P] Implement `ThemeService` in `apps/frontend/src/app/core/theme.service.ts`: signal `mode` (`system|light|dark`), `set(mode)`, derived `resolved`, toggles class `app-dark` on `<html>`, persists to `localStorage` key `vl-theme`, follows live `prefers-color-scheme` changes, invalid or missing value falls back to `system`, no `matchMedia` support falls back to light
- [x] T007 [P] Write `apps/frontend/src/app/core/theme.service.spec.ts`: default system (dark and light), manual override persisted, invalid stored value, live OS change, no `matchMedia`
- [x] T008 [P] Add the pre-paint inline script to `apps/frontend/src/index.html` that sets `app-dark` on `<html>` from `vl-theme` or `prefers-color-scheme` before first paint (same logic as `ThemeService`)
- [x] T009 [P] Extend `apps/frontend/src/styles.css`: app CSS variables for the status colours (mint, lavender, butter, rose) in light and dark, a global `@media (prefers-reduced-motion: reduce)` rule disabling transitions and animations, 44px minimum touch targets for app buttons, base page background/typography
- [x] T010 Register PrimeNG in `apps/frontend/src/app/app.config.ts`: `providePrimeNG({ theme: { preset, options: { prefix: 'p', darkModeSelector: '.app-dark', cssLayer: false } } })`, `MessageService`, plus the animations provider only if T003 found it necessary
- [x] T011 [P] Create `DiceTile` in `apps/frontend/src/app/shared/dice-tile.ts` per `contracts/ui-contract.md`: inputs `value` (1-6), `selected`, `disabled`; output `toggled`; a `button` with `aria-pressed` and label "Die {n}, selected|not selected"; selected state shown by outline/check icon, not colour alone; Space/Enter toggles
- [x] T012 [P] Create `CardTile` in `apps/frontend/src/app/shared/card-tile.ts`: input `card` (`string | null`), shows the card label as text; empty state when `null`
- [x] T013 [P] Create `PlayerTile` in `apps/frontend/src/app/shared/player-tile.ts` per data-model.md: name (ellipsis + title), score, role (host/human/computer), online as text/icon, active with icon and `aria-current="true"`, optional reconnect indicator
- [x] T014 [P] Write specs for the three tiles in `apps/frontend/src/app/shared/dice-tile.spec.ts`, `card-tile.spec.ts`, `player-tile.spec.ts` (inputs, outputs, ARIA attributes, long-name truncation)
- [x] T015 Add a shared axe helper in `apps/frontend/src/app/core/testing.ts` (extend the existing file): `expectNoA11yViolations(fixture)` runs `axe-core` on the rendered element and fails on serious/critical violations; add a helper to render a fixture in light and dark by toggling `app-dark`

**Checkpoint**: Preset, theme service, tiles and test helpers exist and are tested; screens can now be migrated independently.

---

## Phase 3: User Story 1 - Warm, consistent look with light and dark mode (Priority: P1) 🎯 MVP

**Goal**: One warm app shell with a header, theme toggle, toast host and offline notice, in light and dark mode.

**Independent Test**: Open the app with the OS set to light then dark; use the toggle and reload; check 320/360/768/1280 px (quickstart scenarios 1 and 2).

### Tests for User Story 1

- [x] T016 [P] [US1] Update `apps/frontend/src/app/app.spec.ts`: header renders, theme toggle calls `ThemeService.set`, selected mode reflected, offline notice shown/hidden from the socket connection state, axe check in light and dark

### Implementation for User Story 1

- [x] T017 [US1] Rebuild the shell in `apps/frontend/src/app/app.ts` and `apps/frontend/src/app/app.html`: header with app title, `SelectButton` theme toggle (system/light/dark, labelled icons), `p-toast` host, offline `p-message` bound to the socket connection state, main landmark with router outlet, responsive container with no horizontal scroll from 320 px
- [x] T018 [US1] Route `SocketService` notices to PrimeNG `MessageService` in `apps/frontend/src/app/core/socket.service.ts` (severity `info|warn|error`, summary from `errorMessage()`, errors persist until dismissed, info auto-dismisses after 4 s) and replace the old header notice string; update `apps/frontend/src/app/core/socket.service.spec.ts`

**Checkpoint**: User Story 1 works and is testable alone: shell, theme, toggle, toasts and offline notice.

---

## Phase 4: User Story 2 - Polished entry, lobby and game lobby (Priority: P1)

**Goal**: Nickname, create game, main lobby and game lobby redesigned with PrimeNG, inline validation and seat tiles.

**Independent Test**: Two browsers create, join, ready and start a game using only the new screens (quickstart scenario 3).

### Tests for User Story 2

- [x] T019 [P] [US2] Update `apps/frontend/src/app/nickname/nickname.spec.ts`: inline validation message, submit blocked while invalid, axe light and dark
- [x] T020 [P] [US2] Update `apps/frontend/src/app/create-game/create-game.spec.ts`: per-field errors, invalid form cannot submit, axe light and dark
- [x] T021 [P] [US2] Update `apps/frontend/src/app/lobby/lobby.spec.ts`: game cards show name, free seats and key rules, join opens the password dialog, empty state, axe light and dark
- [x] T022 [P] [US2] Update `apps/frontend/src/app/game-lobby/game-lobby.spec.ts`: seat states (empty, human, computer, locked, ready, offline) each have label and icon, host-only controls hidden for non-host, axe light and dark

### Implementation for User Story 2

- [x] T023 [P] [US2] Migrate `apps/frontend/src/app/nickname/nickname.ts` to PrimeNG (`inputtext`, `button`, `message` for inline errors), keep the existing session behaviour
- [x] T024 [P] [US2] Migrate `apps/frontend/src/app/create-game/create-game.ts` to PrimeNG (`inputtext`, `inputnumber`, `toggleswitch`/`checkbox`, `select`, `button`) with inline per-field validation messages (FR-004)
- [x] T025 [P] [US2] Migrate `apps/frontend/src/app/lobby/lobby.ts` to PrimeNG: game `card`s with name, free seats `tag` and rules, join `dialog` with `password` field (focus moves in and returns to the trigger), skeleton/empty state
- [x] T026 [US2] Migrate `apps/frontend/src/app/game-lobby/game-lobby.ts` to seat tiles (`tag`, `avatar`, `button`, `menu` for host seat actions) showing human/computer/locked/ready/offline/host with text and icon; host controls (lock, add computer, kick, start) rendered only when `isHost(view)`

**Checkpoint**: User Stories 1 and 2 both work; lobby flow is playable through the new screens.

---

## Phase 5: User Story 3 - Play a full game with a simple, clear table (Priority: P1)

**Goal**: A table for 2-8 players with scoreboard, card, dice, turn points, enabled-only actions with reasons, turn-end messages and a ranked result.

**Independent Test**: Play a complete game with 2 and with 8 seats on phone and desktop sizes to the result (quickstart scenario 4).

### Tests for User Story 3

- [x] T027 [P] [US3] Update `apps/frontend/src/app/table/table.spec.ts`: all players rendered for 2, 5 and 8 players with name/score/online, active player marked, only allowed actions enabled, disabled-reason text linked via `aria-describedby`, dice selection toggles and sends `turn:action`, spectating another player's turn offers no actions, turn-end message for bank/bust/Stop/Double Lotte/Plus-Minus/Street/Fireworks/Clover, rejected action shows a toast and the table stays usable, axe light and dark
- [x] T028 [P] [US3] Update `apps/frontend/src/app/result/result.spec.ts`: ranking with shared ranks for equal scores, return-to-lobby button, axe light and dark

### Implementation for User Story 3

- [x] T029 [US3] Rebuild the table layout in `apps/frontend/src/app/table/table.ts`: CSS grid, mobile first, 2-column player tiles up to 5 players, compact one-line list rows at 320 px for 6-8 players, tiles around the dice/card centre with a side column from 900 px (research R7); use `PlayerTile`, `CardTile` and `DiceTile`; table keeps ownership of selection state and `socket.send('turn:action', ...)`
- [x] T030 [US3] Rework the turn actions in `apps/frontend/src/app/table/table.ts`: PrimeNG `button`s for draw, throw, set aside, bank reusing the existing `can('draw')`, `canThrow()`, `canBank()` predicates; each disabled action shows a short reason ("Not your turn", "Select at least one die", "Banking needs 350 points") as helper text referenced by `aria-describedby`; each core action takes at most 2 taps (SC-003)
- [x] T031 [US3] Show the turn-end outcome to all players in `apps/frontend/src/app/table/table.ts` by reusing `logText()` for the events `bank`, `bust`, `turnLost`, `penalty`, `volleLotte`, `gameOver` as a toast/banner (FR-010); show turn points and carried points
- [x] T032 [P] [US3] Migrate `apps/frontend/src/app/result/result.ts` to a `card` with an ordered ranked list (rank `tag`, shared rank for equal scores) and a return-to-lobby `button`
- [x] T033 [US3] Check `apps/frontend/src/app/game/game.ts` still switches game lobby / table / result by phase and fits the new shell; adjust only the container markup if needed

**Checkpoint**: A full game is playable from lobby to ranked result with the placeholder tiles.

---

## Phase 6: User Story 4 - Game log, timers and disconnect decisions (Priority: P2)

**Goal**: Scrollable accessible log, reconnect countdown, host decision dialog, waiting notice.

**Independent Test**: Disconnect one player in a running game and observe warning, countdown and dialog for host and non-host; stop the backend for the offline notice (quickstart scenario 5).

### Tests for User Story 4

- [x] T034 [P] [US4] Update `apps/frontend/src/app/table/disconnect-banner.spec.ts`: countdown shown, host sees the decision dialog (computer or free seat) after the grace period, non-host sees a waiting notice, dialog focus moves in and returns, axe light and dark
- [x] T035 [P] [US4] Add log tests to `apps/frontend/src/app/table/table.spec.ts`: log container has `role="log"` and `aria-live="polite"`, never takes focus, entries are in order, container is scrollable

### Implementation for User Story 4

- [x] T036 [US4] Add the game log panel to `apps/frontend/src/app/table/table.ts`: scrollable container (`max-height` with `overflow-y: auto`), newest entry visible, `role="log"`, `aria-live="polite"`, no focus handling
- [x] T037 [US4] Rework `apps/frontend/src/app/table/disconnect-banner.ts`: reuse its existing countdown source, show the countdown with `progressbar` plus text, host gets a modal `dialog` with computer / free seat choices, others get a `message` "Host is deciding"
- [x] T038 [US4] Emit join/leave and connection-loss events as toasts through `MessageService` (FR-014) where the table and lobby handle them; keep errors persistent and info transient

**Checkpoint**: Log, timers, disconnect dialog and notifications all work for host and non-host.

---

## Phase 7: User Story 5 - Accessible and touch friendly (Priority: P2)

**Goal**: Keyboard, focus and reduced-motion quality across every screen.

**Independent Test**: Play a turn with keyboard only; verify dialogs trap and restore focus; enable OS reduced motion (quickstart scenarios 6 and 7).

### Tests for User Story 5

- [ ] T039 [P] [US5] Add a keyboard test in `apps/frontend/src/app/table/table.spec.ts`: dice reachable in order, Space/Enter toggles, every allowed action reachable by Tab and activated by Enter
- [ ] T040 [P] [US5] Add a reduced-motion check in `apps/frontend/src/app/app.spec.ts` (or a small `apps/frontend/src/styles.spec.ts`) asserting the `prefers-reduced-motion` rule exists in `apps/frontend/src/styles.css`

### Implementation for User Story 5

- [ ] T041 [US5] Audit all migrated screens for visible focus rings, 44x44 px targets, logical tab order and non-colour state cues (selected die, active player, locked seat, offline); fix gaps in the affected component files and `apps/frontend/src/styles.css`
- [ ] T042 [US5] Verify dialog focus handling for the join dialog (`apps/frontend/src/app/lobby/lobby.ts`) and the host decision dialog (`apps/frontend/src/app/table/disconnect-banner.ts`): focus moves in, is trapped, returns to the trigger; a turn arriving while a dialog is open keeps focus in the dialog

**Checkpoint**: All five stories are independently functional and accessible.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T043 Check the build against `apps/frontend/project.json` budgets (initial 500kb/1mb, anyComponentStyle 4kb/8kb); raise only if PrimeNG requires it and note the reason in the PR description
- [ ] T044 Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` and `npm run test:coverage`; frontend coverage must stay >= 80% with no new exclusions in `sonar-project.properties`
- [ ] T045 Run the manual scenarios 1-7 in `specs/003-ui-foundation-primeng/quickstart.md` at 320, 360, 768 and 1280 px in light and dark; fix findings
- [ ] T046 [P] Update `docs/migration.md` with the UI toolkit decision (PrimeNG 22.1, Angular 22.1, Terracotta theme, replaceable tiles for the follow-up dice UI)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none; T001 → T002 → T003
- **Foundational (Phase 2)**: after Setup; blocks all stories; T010 needs T004; T015 needs T006
- **US1 (Phase 3)**: after Foundational; the MVP shell
- **US2 (Phase 4)**, **US3 (Phase 5)**: after Foundational and US1 (they render inside the shell); independent of each other
- **US4 (Phase 6)**: after US3 (extends the table component)
- **US5 (Phase 7)**: after US2-US4 (audits migrated screens)
- **Polish (Phase 8)**: after all stories

### Within Each Story

- Tests first (they should fail), then implementation
- Tasks editing the same file (`table.ts`, `table.spec.ts`) run sequentially

### Parallel Opportunities

- Foundational: T004-T009 and T011-T014 touch different files
- US2: T019-T022 specs and T023-T025 screens are all in separate files
- US3: T027/T028 specs, T032 result screen

## Parallel Example: Foundational

```bash
Task: "Create Terracotta preset in apps/frontend/src/app/theme/terracotta-preset.ts"
Task: "Implement ThemeService in apps/frontend/src/app/core/theme.service.ts"
Task: "Create DiceTile in apps/frontend/src/app/shared/dice-tile.ts"
Task: "Create PlayerTile in apps/frontend/src/app/shared/player-tile.ts"
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup, Phase 2 Foundational
2. Phase 3 US1 (themed shell)
3. **Stop and validate** quickstart scenarios 1 and 2

Note: the game must be playable after PrimeNG lands, so US2 and US3 (all P1) complete before the feature is considered shippable; US1 alone is only the first checkpoint.

### Incremental Delivery

1. Setup + Foundational → US1 shell
2. US2 lobby screens → two-browser lobby flow
3. US3 table and result → full playable game
4. US4 log/disconnect → long online games manageable
5. US5 audit → accessibility bar met
6. Polish → budgets, coverage, manual pass

## Notes

- Existing code stays as is where possible: reuse `can()`/`canThrow()`/`canBank()`, `logText()`, `errorMessage()`, `disconnect-banner.ts` countdown
- No protocol, rules or backend change; `PROTOCOL_VERSION` stays 1
- Commit after each task or logical group; hooks are not bypassed
