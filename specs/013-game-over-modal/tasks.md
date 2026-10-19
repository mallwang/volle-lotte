---
description: 'Task list for the game-over modal'
---

# Tasks: Game-Over Modal

**Input**: Design documents from `/specs/013-game-over-modal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test work is included: the constitution requires tests for new logic in the same change.

**Organization**: Tasks are grouped by user story. Each story is independently testable; US1 is the MVP.

## Phase 1: Setup

**Purpose**: The dependency is already installed and committed with the plan (`party-js` 2.2.0 in `package.json`); only verify the build can bundle it.

- [ ] T001 Verify `party-js` bundles with the Angular build by adding the lazy `import('party-js')` in `apps/frontend/src/app/core/celebration.ts` (stub with `start()`/`stop()` signatures) and running `npx nx build frontend`; fix CommonJS or typing issues (for example `allowedCommonJsDependencies` in `apps/frontend/project.json`) if the build warns or fails

---

## Phase 2: Foundational

**Purpose**: Server rule that every story relies on: a finished room can lose players without breaking the table behind the modal (research decision 3 and 4).

**⚠️ CRITICAL**: Complete this phase before the user stories.

- [ ] T002 Add the finished-room leave rule in `apps/backend/src/app/lobby/game-room.ts`: in phase `finished`, `leave()` and a lost connection (`setConnected(false)`, no grace timer, no `disconnected` entry) hand the human seat to a computer seat with `name` = former nickname and `former` set instead of `{ state: 'open' }`; log `left` once; re-elect the host; seat count, order, names and scores unchanged; no rejoin
- [ ] T003 Release a returning player from a finished game in `apps/backend/src/app/lobby/lobby.gateway.ts`: in `session:start`, if the session's room is `finished`, call the room's leave path, clear `session.gameId`, join the lobby and return no `game` and no error
- [ ] T004 [P] Add room tests in `apps/backend/src/app/lobby/game-room.spec.ts`: finished leave and lost connection keep seat count, order, names and scores, log `left` once, elect a host, close the room (via `closeIfEmpty` in the registry spec) when the last human leaves, refuse `rejoin`; lobby and running behaviour unchanged
- [ ] T005 [P] Add gateway tests in `apps/backend/src/app/lobby/lobby.gateway.spec.ts`: `session:start` after the game finished returns no `game`, clears `gameId`, allows `game:create` right away; the other player's `game:state` still lists all seats
- [ ] T006 Make the client treat a finished game as released in `apps/frontend/src/app/core/socket.service.ts`: in `replay`, do not show the "server restarted" warning when the held game was finished; add the case to `apps/frontend/src/app/core/socket.service.spec.ts`

**Checkpoint**: A finished room behaves safely for the players who stay and for the ones who reload.

---

## Phase 3: User Story 1 - Modal shows the result as soon as the game ends (Priority: P1) 🎯 MVP

**Goal**: A non-dismissable modal with the final ranking on top of the finished table; the result page is gone.

**Independent Test**: Play a game to the end: every human sees the modal after the last dice stop, the table is visible behind it, backdrop and Escape do nothing, "Back to the lobby" returns to the games list.

- [ ] T007 [P] [US1] Add English and German texts `gameOver.title`, `gameOver.won`, `gameOver.winner`, `gameOver.reason.targetScore`, `gameOver.reason.clover`, `gameOver.rank`, `gameOver.you`, `gameOver.back` and remove the unused `result.*` keys in `apps/frontend/src/app/i18n/en.ts` and `apps/frontend/src/app/i18n/de.ts`
- [ ] T008 [US1] Create the modal in `apps/frontend/src/app/table/game-over.ts` (`app-game-over`, PrimeNG dialog with `modal`, `closable=false`, `closeOnEscape=false`, `draggable=false`, no dismissable mask): the outcome sentence (winner by `result.winner` mapped through `playerSeats`), way the game ended, ranking (rank tag, names with scores, trophy for rank 1, own row marked, ties share a rank), button "Back to the lobby" calling `socket.leave()`, initial focus on the button
- [ ] T009 [US1] Render the modal in `apps/frontend/src/app/table/table.ts`: visible when `phase === 'finished'`, `you.seat >= 0`, `!roll.rolling()`, no `notice()` and `revealed >= logEnd(view)`; make sure the finished table (turn is `null`) lays out correctly (seats, scores, title row, log; no play buttons, no pause button, no timers)
- [ ] T010 [US1] Show the table for every phase except the lobby in `apps/frontend/src/app/game/game.ts` and delete `apps/frontend/src/app/result/result.ts` and `apps/frontend/src/app/result/result.spec.ts`
- [ ] T011 [P] [US1] Add `apps/frontend/src/app/table/game-over.spec.ts`: ranking with ties, winner text for the winner and the winner's name for others, reason text for target score and Clover, own row marked, Escape and backdrop leave it open, the button calls `leave()`, German texts
- [ ] T012 [US1] Extend `apps/frontend/src/app/table/table.spec.ts`: no modal while running, while dice roll or a notice is shown; modal after everything is revealed; no modal for a player without a seat; update `apps/frontend/src/app/core/testing.ts` helpers if they referenced the result page
- [ ] T013 [US1] Update the game page tests (`apps/frontend/src/app/app.spec.ts` and any spec that expected `app-result`) so the table renders for `finished`

**Checkpoint**: The game ends in a modal over the table (MVP).

---

## Phase 4: User Story 2 - A page reload leads to the lobby (Priority: P1)

**Goal**: A finished game never comes back after a reload, reconnect or navigation; the player can start another game at once.

**Independent Test**: With the modal open reload the page: the games list is shown and a new game can be created; the other player's modal and table are unaffected; browser back leaves without confirmation.

- [ ] T014 [US2] Leave a finished game when navigating away in `apps/frontend/src/app/core/leave-game.ts`: `leaveGameGuard` calls `socket.leave()` for a finished game (no confirmation, `situation` stays `none`, keep the `leaving` mute logic)
- [ ] T015 [US2] Extend `apps/frontend/src/app/core/leave-game.spec.ts`: guard leaves a finished game without a confirmation; lobby and running confirmations unchanged
- [ ] T016 [US2] Run the manual reload and back-button scenarios from `specs/013-game-over-modal/quickstart.md` (scenarios 2 and 4) with the `verify-ui` skill and fix what they show

**Checkpoint**: Reload, reconnect and navigation all end in the games list.

---

## Phase 5: User Story 3 - The winner gets a celebration (Priority: P2)

**Goal**: A repeating confetti celebration for the winner only, reduced-motion aware and reusable.

**Independent Test**: Win a game: confetti plays over the modal and repeats; lose: no animation; with reduced motion: no animation; "Back to the lobby" stops it.

- [ ] T017 [US3] Implement `apps/frontend/src/app/core/celebration.ts`: root service with idempotent `start()` and `stop()`; `start()` does nothing for `prefers-reduced-motion: reduce`; lazy `import('party-js')`; first burst now, then every 3 s while `document.visibilityState` is visible; each burst = three `party.confetti` calls from random points in the top half of the viewport (`party.Rect`) with the ReAIity Guesser variation options (`count`, `spread`, `speed`, `size` ranges)
- [ ] T018 [P] [US3] Add `apps/frontend/src/app/core/celebration.spec.ts` (mock `party-js`): start is idempotent, bursts repeat every 3 s, stop clears the timer, reduced motion starts nothing, a hidden document skips the burst
- [ ] T019 [US3] Start and stop the celebration in `apps/frontend/src/app/table/table.ts`: an `effect` starts it when the modal is visible and the player is the winner (and the system allows motion), stops it otherwise, and `DestroyRef` stops it when the table is destroyed or the player leaves
- [ ] T020 [US3] Extend `apps/frontend/src/app/table/table.spec.ts`: celebration starts for the winner only, never for a loser, a computer winner or a seatless player, and stops when the modal hides or the table is destroyed
- [ ] T021 [US3] Verify in the browser (`verify-ui` skill) that confetti is visible above the modal, does not block clicks on the button, repeats and stops on leave; adjust the layer or `pointer-events` if it blocks

**Checkpoint**: The winner is celebrated; everyone else sees the quiet modal.

---

## Phase 6: User Story 4 - Texts and documentation in both languages (Priority: P3)

**Goal**: English and German texts, user guide and roadmap are up to date.

**Independent Test**: Switch the UI language at the end of a game and check every modal text; read the user guide.

- [ ] T022 [P] [US4] Update `docs/user-guide.md` and `docs/user-guide.de.md`: replace the result screen sentence with the game-over modal, the reload behaviour (a finished game is not restored) and the winner celebration with reduced motion
- [ ] T023 [P] [US4] Update `docs/roadmap.md`: move R16 to Done as spec 013 with a one-line result, remove R16 from Next, update the R7 and R17 notes (the game-over modal exists; the celebration service in `core/celebration.ts` is the shared fireworks component), and bump "Last updated"
- [ ] T024 [US4] Check keyboard focus, contrast in light and dark theme and the small-window case (scenarios 5 and 6 in `specs/013-game-over-modal/quickstart.md`) with the `verify-ui` skill and fix what they show

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T025 Run `npx nx run-many -t lint typecheck test build` for the affected projects and fix failures; run the coverage guard from `.specify/memory/test-coverage-guide.md` for the new files
- [ ] T026 Run the manual end-to-end scenarios 1 and 3 from `specs/013-game-over-modal/quickstart.md` and remove any temporary scripts

---

## Dependencies & Execution Order

- Phase 1 first (T001), then Phase 2 (T002 -> T003; T004, T005 after their code; T006 independent).
- US1 (Phase 3) needs Phase 2 for the table behind the modal to survive leaving players. T007 before T008; T008 before T009; T009 and T010 before T012 and T013.
- US2 (Phase 4) needs US1 (T014 relies on the finished table being the page).
- US3 (Phase 5) needs US1 (the modal's visibility signal) and T001 (the celebration stub). T017 before T019.
- US4 (Phase 6) can start with T022 and T023 once the behaviour is settled; T024 needs US1 and US3.
- Polish last.

### Parallel Opportunities

- T004, T005 and T006 (different files, backend vs frontend).
- T007 and T011 alongside T008 once the keys are agreed.
- T018 next to T017; T022 and T023 together.

## Implementation Strategy

- **MVP**: Phases 1-3 (modal over the finished table, result page removed, finished-room rule).
- Then US2 (reload and navigation), US3 (celebration), US4 (docs), polish.
- Commit per phase through the Spec Kit hooks; run the affected tests before each commit.
