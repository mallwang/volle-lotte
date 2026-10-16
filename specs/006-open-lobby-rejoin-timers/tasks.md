# Tasks: Open Lobbies, Rejoin, Leave Warning and Turn Timers

**Input**: Design documents from `/specs/006-open-lobby-rejoin-timers/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/protocol.md, design.md / mockup.html

**Tests**: Included (plan.md Testing section and constitution III, ≥ 80 % coverage). Use fake timers for grace, turn timers and timeout counting.

**Organization**: Grouped by user story. Paths are relative to the repo root. Backend lobby dir: `apps/backend/src/app/lobby/` (abbrev. `B/`); frontend app dir: `apps/frontend/src/app/` (abbrev. `F/`); engine: `libs/game-rules/src/lib/` (abbrev. `G/`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 open games, US2 close seat/ban, US3 leave warning + bot replacement, US4 rejoin, US5 turn timers

---

## Phase 1: Setup

**Purpose**: Protocol v3 shared by backend and frontend (contracts/protocol.md)

- [x] T001 Update `G/protocol.ts`: `PROTOCOL_VERSION` 3; `GameSummary` `locked` → `protected: boolean` plus `rejoinable: boolean`; `SeatView.former?: { nickname }`; `GameView` drop `pending`/`graceEndsAt`, add `turnDeadline?: { at, phase }` and `you.timeoutWarning`; add intents `game:rejoin {gameId}` and `seat:remove {seat}`, remove `host:decide`; `ErrorReason` add `banned`, `notRejoinable`, remove `nothingPending`, `paused`; `game:closed` reason `'banned'` (drop `'removed'`); `LogKind` add `replaced`, `rejoined`, `timedOut`, `removed`, remove `waitingForHost`, `hostDecided`
- [x] T002 [P] Add pure `skipTurn(state): GameState` to `G/game.ts` (next player's fresh turn, scores unchanged, log `turnSkipped`, unchanged if `result` set) and export it from the lib index; add tests in `G/game.spec.ts`

**Checkpoint**: Shared types compile; downstream code will show type errors to fix in the phases below.

---

## Phase 2: Foundational (blocking)

**Purpose**: Remove the host-decision flow and add room fields every story builds on

- [x] T003 In `B/game-room.ts` remove the `pending` set, `decide`, grace-pause logic and `graceEndsAt`; set `GRACE_MS = 30_000`; add constants `TURN_LIMIT_MS`, `MAX_TIMEOUTS = 3`; add `banned: Set<string>`, seat `timeouts: number`, computer seat `former?: { playerId, nickname }` (data-model.md)
- [x] T004 In `B/game-room.ts` add single `replaceByBot(seat, reason)`: random difficulty via `levelFor('random')`, set `former`, add `replaced` log entry (reason `left|disconnected|timeouts`), continue pending action through existing `emit()`/`scheduleComputer()`; wire grace expiry to it
- [x] T005 In `B/lobby.gateway.ts` remove the `host:decide` handler and related error paths; in `B/view.ts` drop `pending`/`graceEndsAt`, expose `SeatView.former` (nickname only)
- [x] T006 [P] Delete `F/table/disconnect-banner.ts` and `F/table/disconnect-banner.spec.ts`; remove its use in `F/table/table.ts`; remove host-decision UI and `waitingForHost`/`hostDecided` texts from `F/i18n/en.ts` and `F/i18n/de.ts`; update `F/core/socket.service.ts` and `F/core/testing.ts` for the removed intent
- [x] T007 Fix existing tests broken by the removal (`B/game-room.spec.ts`, `B/lobby.gateway.spec.ts`, `F/core/i18n.service.spec.ts`, others reported by `npm run typecheck`); add `B/game-room.spec.ts` cases for `replaceByBot` (random difficulty, `former` set, bot continues on its turn) and 30 s grace takeover with fake timers

**Checkpoint**: `npm run typecheck` and `npm run test` green; disconnect now ends in a bot after 30 s (covers US3 scenario 4/5 backend).

---

## Phase 3: User Story 1 - Open games without a password (P1) 🎯 MVP

**Goal**: Create without password; one-tap join in lobby phase; started games shown closed.

**Independent Test**: Create game with empty password, join from a second session without prompt, start, a third session cannot join.

- [x] T008 [P] [US1] `B/lobby.gateway.ts` + `B/game-registry.service.ts`: `game:create` accepts `password: ''` (empty hash = open; `invalidPassword` only for 1–3 or > 64 chars); `game:join` skips password check and attempt limiter when hash is empty; summaries emit `protected` instead of `locked`; add tests in `B/lobby.gateway.spec.ts` and `B/game-registry.service.spec.ts`
- [x] T009 [P] [US1] `F/create-game/create-game.ts`: password optional (hint text, validation allows empty or 4–64 chars); add test
- [x] T010 [US1] `F/lobby/lobby.ts`: open / protected / running (lock icon + "running") / full badges per mockup; open game joins with one tap without prompt; no Join action for started games; update `F/lobby/lobby.spec.ts`
- [x] T011 [P] [US1] Add EN + DE texts for open/protected/running/full/optional password in `F/i18n/en.ts` and `F/i18n/de.ts`

**Checkpoint**: US1 fully functional (MVP together with US5).

---

## Phase 4: User Story 5 - Turn timers (P1)

**Goal**: Server-enforced per-phase limits with visible countdown, auto-actions, 3-strike bot replacement.

**Independent Test**: With one human, idle in each phase and observe automatic outcome and countdown.

- [x] T012 [US5] `B/game-room.ts`: single `turnTimer` armed in `emit()` when a human is to act; limit by phase (draw/throw 10 s, select 15 s, decide 15 s); start delay `ROLL_MAX_MS + AFTER_ROLL_MS` after a `thrown` event; set `turnDeadline`; clear in `apply`/`dispose`; not armed for computer seats; keep running while disconnected
- [x] T013 [US5] `B/game-room.ts`: expiry actions draw→`draw`, throw→`throw`, select→`skipTurn`, decide→`bank`; log `timedOut` (data = action); increment seat `timeouts`; own action resets to 0; 3rd timeout calls `replaceByBot(seat, 'timeouts')`; bust ends the turn without a decide timer
- [x] T014 [US5] `B/view.ts`: send `turnDeadline` only while a human is to act and `you.timeoutWarning` when `timeouts === MAX_TIMEOUTS - 1`
- [x] T015 [US5] Tests in `B/game-room.spec.ts` with fake timers: each phase expiry outcome, no timer on bot turns, timer starts after animation delay, racing action vs expiry applies once, strike counting/reset/warning flag, 3rd strike replaces by bot, disconnected player still times out
- [x] T016 [P] [US5] Create `F/table/turn-timer.ts` (+ `turn-timer.spec.ts`): countdown bar from `turnDeadline.at`, shown for all players, hidden before animation end and on bot turns
- [x] T017 [US5] `F/table/table.ts`: embed `turn-timer`, show timeout warning banner when `you.timeoutWarning`, render `timedOut`/`replaced` log entries; update `F/table/table.spec.ts`
- [x] T018 [P] [US5] Add EN + DE texts for timer, warning and timeout log entries in `F/i18n/en.ts` and `F/i18n/de.ts`

**Checkpoint**: US5 works independently.

---

## Phase 5: User Story 2 - Host closes a seat and removes a player (P2)

**Goal**: Host can close an occupied human seat in the lobby phase; removed player is banned.

**Independent Test**: Two sessions in a game lobby; host closes the other's seat; modal shows; re-join refused.

- [x] T019 [US2] `B/game-room.ts` + `B/lobby.gateway.ts`: `seat:remove {seat}` (host, lobby phase only; errors `notHost`, `gameStarted`, `invalidRequest`, `seatNotFree`): seat becomes `locked`, playerId added to `banned`, push `game:closed {reason:'banned'}` to the removed player (also on return if disconnected); `join` rejects banned ids with `banned`; voluntary lobby leave does not ban; add tests in `B/game-room.spec.ts` and `B/lobby.gateway.spec.ts`
- [x] T020 [US2] `F/game-lobby/game-lobby.ts`: host "Close seat" action on human seats; removed player modal "You were removed by the host" with "Back to lobby"; `F/core/socket.service.ts` close reason `banned`; `F/core/error-message.ts` message for `banned`; update `F/game-lobby/game-lobby.spec.ts`
- [x] T021 [P] [US2] Add EN + DE texts for close seat, removal modal and `banned` error in `F/i18n/en.ts` and `F/i18n/de.ts`

**Checkpoint**: US2 works independently.

---

## Phase 6: User Story 3 - Leave warning and bot replacement (P2)

**Goal**: Confirm modal before leaving a running game; leave hands the seat to a bot immediately.

**Independent Test**: Leave → modal → cancel (no change) → leave → confirm (bot plays next).

- [x] T022 [US3] `B/game-room.ts` + `B/lobby.gateway.ts`: `game:leave` in a running game calls `replaceByBot(seat, 'left')` and returns the player to the lobby (lobby phase behaviour unchanged); tests in `B/game-room.spec.ts` / `B/lobby.gateway.spec.ts` including bot taking the pending action on that seat's turn and log entry
- [x] T023 [US3] `F/table/table.ts`: Leave opens PrimeNG confirm Dialog (bot of random difficulty, back to lobby, can rejoin; Cancel / Confirm, ≥ 44 px targets); only confirm sends `game:leave`; update `F/table/table.spec.ts`
- [x] T024 [P] [US3] Add EN + DE texts for the leave modal and `replaced` log entries in `F/i18n/en.ts` and `F/i18n/de.ts`

**Checkpoint**: US3 works independently.

---

## Phase 7: User Story 4 - Rejoin a left game (P2)

**Goal**: Replaced player can reclaim their seat from the game list; others see it.

**Independent Test**: Leave a running game, see Rejoin in the list, rejoin, check log/toast in another session; other players see no Rejoin.

- [x] T025 [US4] `B/game-room.ts`: `rejoin(playerId)` finds the computer seat with `former.playerId`, rejects banned/other ids (`notRejoinable`, `banned`, `alreadyInGame`), restores human seat (nickname from `former`, `connected: true`, `timeouts = 0`, score untouched), clears computer timer, logs `rejoined`
- [x] T026 [US4] `B/lobby.gateway.ts` + `B/game-registry.service.ts`: `game:rejoin {gameId}` using `session.playerId` (`gameNotFound` when missing); per-socket `lobby:list`/`lobby:games` summaries with `rejoinable`; `pushLobby()` iterates lobby sockets; tests in `B/lobby.gateway.spec.ts`, `B/game-registry.service.spec.ts`, `B/game-room.spec.ts` (other player not rejoinable, finished game not rejoinable)
- [x] T027 [US4] `F/core/socket.service.ts` rejoin intent; `F/lobby/lobby.ts` "Rejoin" button when `rejoinable`; `F/table/table.ts` toast on `rejoined` log entry for all players and seat no longer shown as computer (`former` cleared); update `F/lobby/lobby.spec.ts`, `F/table/table.spec.ts`
- [x] T028 [P] [US4] Add EN + DE texts for Rejoin, `rejoined` log/toast and `notRejoinable` error in `F/i18n/en.ts`, `F/i18n/de.ts`, `F/core/error-message.ts`

**Checkpoint**: All stories functional.

---

## Phase 8: Polish & Cross-Cutting

- [x] T029 [P] Update docs: `docs/rules.md` (timers, bot replacement), `docs/migration.md` (protocol v3, removed host decision), README if it mentions password or disconnect handling
- [x] T030 Run `npm run lint`, `npm run typecheck`, `npm run test`; confirm coverage ≥ 80 % for touched projects
- [x] T031 Run the 9 scenarios of `specs/006-open-lobby-rejoin-timers/quickstart.md` manually (EN + DE, light/dark, phone width)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocks all stories) → stories → Phase 8.
- T001 before everything; T002 parallel with T003+.
- T004 depends on T003; US3 (T022) and US5 (T013) depend on T004; US5 expiry (T013) depends on T002.
- US4 (T025) depends on T004 (`former`) and T019 for the ban check (can stub the set from T003).
- US1 and US2 are independent of each other; US3, US4, US5 share `B/game-room.ts` so backend tasks there run sequentially.
- Within a story: backend before frontend; texts ([P]) any time.

### Parallel Opportunities

- T002 ∥ T003/T004; T006 ∥ T005.
- After Phase 2: US1 (T008, T009, T011), US5 frontend (T016, T018), US2 texts (T021) can run in parallel with backend work on `game-room.ts`.
- All i18n tasks touch the same two files, so run them in different stories' time slots or merge carefully.

## Implementation Strategy

- **MVP**: Phase 1 + 2 + US1 + US5 (both P1): open games and server timers.
- **Increment**: US3 → US4 (leave then rejoin) → US2 (ban).
- Commit after each task or logical group; run `npm run typecheck && npm run test` at each checkpoint.
