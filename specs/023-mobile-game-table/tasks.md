---
description: 'Task list for M2 Mobile Game Table'
---

# Tasks: M2 Mobile Game Table

**Input**: Design documents from `/specs/023-mobile-game-table/`

**Prerequisites**: plan.md, spec.md, design.md, mockup.html, research.md, data-model.md, contracts/

**Tests**: The constitution (III) requires specs for new logic, and the plan lists specs for helpers, service additions and each component. Spec tasks sit next to the code they cover (Jest, `*.spec.ts`). No separate TDD phase.

**Organization**: Grouped by user story. US1-US4 are P1, US5 is P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on open tasks)
- **[Story]**: US1-US5, from spec.md
- Mobile may only import `scope:shared`; styles are plain CSS, split per component (budget 4 kb warn / 8 kb error); texts in English and German (no gender-inclusive forms in German).

## Path Conventions

- Mobile app: `apps/mobile/src/app/`
- Shared view logic: `libs/client-core/src/lib/`
- Desktop (re-export only): `apps/frontend/src/app/core/`
- Tests live next to the code as `*.spec.ts`

---

## Phase 1: Setup

**Purpose**: Page-level settings and routing skeleton

- [x] T001 [P] Add `maximum-scale=1, user-scalable=no` to the viewport meta in `apps/mobile/src/index.html` (keep `viewport-fit=cover`)
- [x] T002 [P] Add the table i18n keys (about 25: rotate message, leave dialog, game over, actions, reasons, timer, seat markers, notices) to `apps/mobile/src/app/i18n/mobile-en.ts` and `apps/mobile/src/app/i18n/mobile-de.ts`; keep `apps/mobile/src/app/i18n/mobile-i18n.spec.ts` green (same keys in both languages); reuse shared keys from `libs/client-core/src/lib/i18n/` where they exist

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared view logic, socket service additions and the table route. No story can start before this is done.

**⚠️ CRITICAL**: Complete before any user story.

- [x] T003 Move the pure helpers (`seatViews`, `seatAreas`, `playerSeats`, `seatName`, `youWon`, `logText` and related types) from `apps/frontend/src/app/core/table-view.ts` to `libs/client-core/src/lib/table-view.ts`; move the pure helpers from `apps/frontend/src/app/core/game-view.ts` (`nextThrowRisk`, `safeLabel`, `pileLevel`, `playedCards`, `totalCards`) to `libs/client-core/src/lib/game-view.ts`; move their specs along (`table-view.spec.ts`, `game-view.spec.ts`); export all from `libs/client-core/src/index.ts`
- [x] T004 Replace the bodies of `apps/frontend/src/app/core/table-view.ts` and `apps/frontend/src/app/core/game-view.ts` with re-exports from `@volle-lotte/client-core` (use the actual package alias from `tsconfig.base.json`); desktop specs must pass unchanged (`npx nx test frontend`) (depends on T003)
- [x] T005 Extend `apps/mobile/src/app/core/mobile-socket.service.ts`: signals for `turnDeadline`, `preview`, `seats`, `log` as delivered by `game:snapshot` and `game:change` (via `applyChange` and `decodeView`); `pending` signal (set on send, cleared on ack or next view change); `action(action)` sending `turn:action` (refused with `reason: 'offline'` while offline, ignored while `pending`); `preview(dice)` sending `turn:preview` (not blocked by `pending`); `leave()` sending `game:leave`; handlers for `game:settingsChanged` and `game:closed`; ack `ok: false` maps to an error message and clears `pending`. Extend `apps/mobile/src/app/core/mobile-socket.service.spec.ts` for each addition, including duplicate-send protection
- [x] T006 [P] Create `apps/mobile/src/app/core/dice-roll.ts`, a small port of the desktop `DiceRollService`/`rollDurations` (client-only reveal of the server dice, skipped under `prefers-reduced-motion`), with `apps/mobile/src/app/core/dice-roll.spec.ts` (reference: `apps/frontend/src/app/core/dice-roll.ts`)
- [x] T007 [P] Create `apps/mobile/src/app/core/celebration.ts` with a lazy `import('party-js')` confetti, no-op under reduced motion, with `apps/mobile/src/app/core/celebration.spec.ts` (reference: `apps/frontend/src/app/core/celebration.ts`)
- [x] T008 Add the `table/:id` route to `apps/mobile/src/app/app.routes.ts` using the existing session guard plus a membership guard (not seated in a running game: redirect to `''`); create the minimal container `apps/mobile/src/app/table/table.ts` (loads or rejoins the game via `game:rejoin`, exposes `game`, `current`, `isMyTurn`, `chosen` and `pending`); add the membership guard spec next to `apps/mobile/src/app/core/session.guard.spec.ts` (depends on T005)

**Checkpoint**: Shared helpers available to both apps, socket service can send turn intents, route renders an empty table.

---

## Phase 3: User Story 1 - Play my turn with touch (Priority: P1) 🎯 MVP

**Goal**: The seated player sees the board and performs every turn action by touch.

**Independent Test**: In a game with a computer, hold the phone in landscape, draw, throw, select and set aside dice, throw again or bank, and reach the end of the turn; on bust the outcome is shown.

- [x] T009 [P] [US1] Create `apps/mobile/src/app/table/table-board.ts` (+ `table-board.spec.ts`): card tile with deck prompt and current card, turn points and carried points, dice 46-56 px with 6-8 px gaps and touch targets that ignore accidental drags, dice selection (toggle into `chosen`, locked dice not selectable), status line with hint text and the bust, Volle Lotte, Street and card-effect notice held for `pacing(...).noticeMs`; plain CSS, `touch-action: manipulation`
- [x] T010 [P] [US1] Create `apps/mobile/src/app/table/table-actions.ts` (+ `table-actions.spec.ts`): buttons draw, throw, select (confirm), bank, plus continue after Volle Lotte, each ≥ 48 px high, text labels that wrap onto two lines; a disabled action shows its reason as text above the buttons; all disabled when it is not my turn or `pending`; explanation for an invalid selection as on desktop
- [x] T011 [US1] Compose board and actions in `apps/mobile/src/app/table/table.ts` (+ `table.spec.ts`): derive `actions` (`{ enabled, reason }`) from `game.turn` and own turn, call `socket.action(...)`, send `turn:preview` on every change of `chosen` while it is my turn, clear `chosen` on a new turn step or throw, run the dice-roll reveal from `dice-roll.ts`, show server error messages in the status line (depends on T009, T010)
- [x] T012 [US1] Table root styles in `apps/mobile/src/app/table/table.ts`: three regions (players, board, actions) per [contracts/routes-and-ui.md](contracts/routes-and-ui.md), `overflow: hidden`, `100dvh`, `touch-action: manipulation`, `env(safe-area-inset-*)` padding, reduced motion respected (depends on T011)

**Checkpoint**: A player can play a complete turn on the phone (players column and blocker not yet present).

---

## Phase 4: User Story 2 - Always know whose turn it is (Priority: P1)

**Goal**: All seats (2-8) with name, score, markers and the active seat stay readable; the timer is visible.

**Independent Test**: Watch games with 2, 4 and 8 seats at 568×320; the active seat is identifiable at a glance and nothing is hidden.

- [x] T013 [P] [US2] Create `apps/mobile/src/app/table/table-players.ts` (+ `table-players.spec.ts`): one row per seat from `seatViews(...)` with name (ellipsis), score and markers; active seat has a thick border, ▶ marker and fill (not color only); computer marker, replaced marker with the former nickname in the title, "offline" marker and dimmed row when disconnected, struck through when gone; names capped at 20 characters, computers show the animal name only; spec covers 2 and 8 seats and each seat state
- [x] T014 [US2] Add the turn timer to the strip in `apps/mobile/src/app/table/table-board.ts` (+ extend `table-board.spec.ts`): bar from `turnDeadline.at` (server clock offset as on desktop) plus seconds as text in the last 10 s; one `interval(250)` signal that runs only while a deadline exists; rules summary in the strip following `game:settingsChanged` (depends on T009)
- [x] T015 [US2] Place `table-players` in the container in `apps/mobile/src/app/table/table.ts` (+ extend `table.spec.ts`): the players column width 10-13 rem, the active seat follows `game.current`, long German and English card names and rules do not push scores or controls off screen (depends on T011, T013)

**Checkpoint**: Players column, board and actions complete the three-column layout.

---

## Phase 5: User Story 3 - Landscape-only table with rotate blocker (Priority: P1)

**Goal**: Portrait shows a blocker with Leave while the table stays mounted and keeps its state.

**Independent Test**: Rotate to portrait mid-turn with dice selected, then back: same selection and state, no turn lost.

- [x] T016 [US3] Add the rotate blocker to `apps/mobile/src/app/table/table.ts`: overlay shown by `@media (orientation: portrait)` only (no TypeScript orientation state), rotate message and a Leave button, table stays mounted behind it; lobby and other screens get no blocker (depends on T012)
- [x] T017 [US3] Extend `apps/mobile/src/app/table/table.spec.ts`: the blocker and the table are both in the DOM, `chosen` and `pending` are unchanged after the blocker is toggled, Leave in the blocker triggers the same leave flow (depends on T016, T019)

**Checkpoint**: Rotation never changes game or selection.

---

## Phase 6: User Story 4 - Finish a game together with desktop players (Priority: P1)

**Goal**: Leave with confirmation, game over with ranking and confetti, mixed games stay consistent.

**Independent Test**: Host on desktop, join with a phone, play to the end; leave mid-game on a second run and verify the computer takes over.

- [x] T018 [P] [US4] Create `apps/mobile/src/app/table/game-over.ts` (+ `game-over.spec.ts`): dialog from `game.result` with all players (≤ 8), winner on top, final ranking, Leave without confirmation, focus trapped; confetti through `celebration.ts` when `youWon(...)`
- [x] T019 [P] [US4] Create `apps/mobile/src/app/table/leave-dialog.ts` (+ `leave-dialog.spec.ts`): confirm and back, text states that a computer takes the seat, focus trapped, real `<button>` elements with visible focus
- [x] T020 [US4] Wire both dialogs and the Leave button of the strip into `apps/mobile/src/app/table/table.ts` (+ extend `table.spec.ts`): `leaveOpen`, `socket.leave()` then navigate to `''`, `game:closed` navigates to `''`, game over replaces the leave confirmation (depends on T011, T018, T019)

**Checkpoint**: A full game can be played, left and finished on the phone.

---

## Phase 7: User Story 5 - Enter a running game from lobby and list (Priority: P2)

**Goal**: Starting a game, reloading, or opening a running own game from the list reaches the table.

**Independent Test**: Start in the phone lobby and see the table open; reload on `table/:id` and return to the same state; open a running own game from the list.

- [x] T021 [P] [US5] In `apps/mobile/src/app/game-lobby/game-lobby.ts` navigate to `table/:id` when the game starts (+ extend `game-lobby.spec.ts`); remove the "table not yet available" notice and its i18n keys
- [x] T022 [P] [US5] In `apps/mobile/src/app/list/list.ts` send a seated player of a running game to `table/:id`, keep the M1 actions for games the user is not part of (+ extend `list.spec.ts`)
- [x] T023 [US5] Delete `apps/mobile/src/app/started/started.ts`, remove the `started` route in `apps/mobile/src/app/app.routes.ts` and let `**` redirect to `''`; update `apps/mobile/src/app/app.spec.ts` if it references `started` (depends on T021, T022)

**Checkpoint**: The entry flow is end to end; M1 placeholder is gone.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T024 [P] Update `docs/roadmap.md` (M2 done), `docs/mobile-roadmap.md` if present, and the German companion files (`*.de.md`) where they exist; English only in code comments
- [x] T025 Run `npx nx run-many -t lint typecheck test -p mobile client-core frontend` and `npx nx build mobile --configuration=production`; fix component style budget warnings by splitting styles further
- [x] T026 Run the manual scenarios of [quickstart.md](quickstart.md) (2, 4 and 8 seats, 568×320 / 667×375 / 932×430, rotation, double tap, timer and seat states, languages, themes, reduced motion); fix findings
- [x] T027 Run `npm run test:e2e` via the `run-e2e` skill for a mixed desktop and phone game, and `npm run measure:socket -- --label m2` to confirm no change in socket traffic ([docs/socket-traffic.md](../../docs/socket-traffic.md))

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)**: none
- **Foundational (2)**: after Setup; blocks all stories
- **US1 (3)** → **US2 (4)** → **US3 (5)** and **US4 (6)**: all edit `table.ts`, so run them in order; the `[P]` component tasks inside each phase may run in parallel
- **US5 (7)**: needs only Phase 2 (the route); can run in parallel with US1-US4
- **Polish (8)**: after all stories

### Within Phases

- T003 → T004; T005 → T008
- T017 needs T019 (leave flow) and T016
- T011 needs T009 and T010; T015 needs T011 and T013; T020 needs T011, T018, T019
- T023 needs T021 and T022

### Parallel Opportunities

- Setup: T001, T002
- Foundational: T006, T007 alongside T003-T005
- US1: T009, T010
- US2/US4: T013 can start with T009; T018 and T019 can run together
- US5: T021, T022

### Parallel Example: User Story 1

```text
Task: "Create table-board.ts in apps/mobile/src/app/table/"
Task: "Create table-actions.ts in apps/mobile/src/app/table/"
```

---

## Implementation Strategy

### MVP First (US1)

1. Setup and Foundational (T001-T008)
2. US1 (T009-T012): a turn can be played on a phone
3. Validate with a game against a computer; also needs US5's T021 to reach the table without typing the URL

### Incremental Delivery

1. - US2 (players column, timer) → readable with eight seats
2. - US3 (blocker) → safe rotation
3. - US4 (leave, game over) → full games
4. - US5 (entry flow) → M1 placeholder replaced
5. Polish and the manual and e2e checks

---

## Notes

- Server stays authoritative: no optimistic state, `pending` only blocks repeats (FR-013).
- Desktop behavior must not change; desktop specs stay unmodified (SC-006).
- Commit after each task or logical group, conventional commits in English.
