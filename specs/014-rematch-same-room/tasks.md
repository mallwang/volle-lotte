---
description: 'Task list for the rematch in the same room'
---

# Tasks: Rematch in the Same Room

**Input**: Design documents from `/specs/014-rematch-same-room/`

**Prerequisites**: plan.md, spec.md, design.md, research.md, data-model.md, contracts/rematch-protocol.md

**Tests**: Test work is included: the constitution requires tests for new logic in the same change.

**Organization**: Tasks are grouped by user story. US1 is the MVP (host reopens the room); US2 and US3 complete the flow; US4 hardens the round boundary; US5 is texts and documentation.

## Phase 1: Setup

**Purpose**: Shared protocol types; every layer depends on them.

- [x] T001 Update `libs/game-rules/src/lib/protocol.ts` per `contracts/rematch-protocol.md`: `PROTOCOL_VERSION` 9 to 10; `SeatView.state` also `'reserved'`; `GameView.round: number`, `GameView.rematch?: 'open' | 'closed'`, `GameView.you.reserved?: number`; `ErrorReason` `'staleRound'`; `LogKind` `'rematch'`; `Intents` `'rematch:start': [{ round: number }, object]` and `'rematch:join': [{ round: number }, { game: GameView }]`; keep `libs/game-rules/src/index.ts` exports in sync and run `npx nx typecheck` to list the places that must learn the new seat state

---

## Phase 2: Foundational

**Purpose**: The reserved seat, the round counter and the snapshot view that all stories use (data-model.md).

**⚠️ CRITICAL**: Complete this phase before the user stories.

- [x] T002 Extend `apps/backend/src/app/lobby/game-room.ts`: add the `Seat` variant `{ state: 'reserved'; playerId: string; nickname: string; language: UiLanguage }`; add `round = 1`, `archive` (`{ round, game, seats, log, logBase, hostId }` or `undefined`) and `dropped: Set<string>`; `summary()` counts `reserved` in `seatsUsed`; `takenNames()` includes the nickname of a `reserved` seat (lower case); `start()` and `canStart` logic must not treat `reserved` as human or computer; add `reservedSeat(playerId)` and `watchers()` (player ids of `reserved` seats plus `dropped`) helpers
- [x] T003 Extend `apps/backend/src/app/lobby/view.ts`: map a `reserved` seat to `{ state: 'reserved', nickname }`; add `round: room.round` to every view; when the player has a reserved seat or is in `room.dropped`, build the snapshot view from `room.archive` (`phase: 'finished'`, archived `game`, `seats`, `log`, `logBase`, `hostId`, `round: archive.round`, `you.seat` = the player's seat index in the archived seats, `you.reserved` = their reserved seat index, `rematch: 'open'` for reserved and `'closed'` for dropped players); never include the deck
- [x] T004 [P] Add room tests in `apps/backend/src/app/lobby/game-room.spec.ts`: a room with a `reserved` seat counts it in `summary().seatsUsed`, refuses `join` onto it (`seatNotFree`), refuses a newcomer using its nickname (`nicknameTaken`), and `start` neither counts it as a player nor waits for it
- [x] T005 [P] Add `apps/backend/src/app/lobby/view.spec.ts`: normal views carry `round`; `reserved` seats are visible to everybody with the nickname; a reserved player gets the snapshot view (`finished`, `rematch: 'open'`, archived round, own archived `you.seat`, `you.reserved`), a dropped player gets `rematch: 'closed'`; no deck in any view
- [x] T006 Teach the frontend about the new seat state in `apps/frontend/src/app/core/game-view.ts` (`playerSeats` keeps counting only `human` and `computer`), `apps/frontend/src/app/core/table-view.ts` and `apps/frontend/src/app/game-lobby/game-lobby.ts` (`canStart` ignores `reserved`); add a helper `rematchState(view)` in `apps/frontend/src/app/core/game-view.ts` returning `'waiting' | 'open' | 'closed'` for a finished view (`undefined` rematch means `waiting`), with a test in `apps/frontend/src/app/core/game-view.spec.ts`

**Checkpoint**: The new types compile everywhere and a view can show a reserved seat and a snapshot.

---

## Phase 3: User Story 1 - The host starts a rematch with one click (Priority: P1) 🎯 MVP

**Goal**: The host's click turns the finished room into a lobby with unchanged settings; the host is in it at once.

**Independent Test**: Finish a game with the host, one other human and one computer. The host clicks "Rematch": the host sees the lobby with the same name, password, computer settings and seat order, nobody ready; "Back to the lobby" without a rematch behaves as before.

- [x] T007 [US1] Add `rematch(playerId: string, round: number): Res` to `apps/backend/src/app/lobby/game-room.ts`: `notHost` unless `playerId === hostId`; `staleRound` unless `round === this.round`; `gameStarted` unless `phase === 'finished'`; then take the `archive` snapshot (deep copy of `game`, `seats`, `log`, `logBase`, `hostId`, `round`), set `phase = 'lobby'`, `game = null`, `seatOfEngine = []`, `preview = []`, `paused = false`, clear `turnDeadline`, `computerDelay`, `turnDelay`, `frozen`, `pending`, timers; seats per data-model.md (host stays human with `ready=false`; other humans become `reserved`; computer with `former` becomes `{ state: 'open' }`; computer without `former`, open and locked seats unchanged); advance `logBase` by `log.length`, empty `log`, add a `rematch` entry; `round++`; clear `dropped`; `emit()`
- [x] T008 [US1] Add the `rematch:start` handler in `apps/backend/src/app/lobby/lobby.gateway.ts`: validate `round` with `isInt(b['round'], 1, 1e6)` (else `invalidRequest`), run `room.rematch`, reuse `inRoom`/`done`; extend `push` so `room.watchers()` also receive their `game:state` (snapshot view); the host gets the lobby view through the normal push
- [x] T009 [P] [US1] Add room tests in `apps/backend/src/app/lobby/game-room.spec.ts`: `rematch` keeps id, name, password hash, rules, settings (`computerSpeed`, `fastComputerDice`, `showBustProbability`) and seat order; the host is human and not ready; other humans are `reserved`; seats of leavers (computer with `former`) and of humans a computer replaced become `open`; host-set computers keep name, skill and risk; locked seats stay locked; the log is empty except one `rematch` entry and `logBase` kept growing; `round` increments; a second rematch after a second game works; `notHost`, `staleRound` and `gameStarted` are rejected without any change
- [x] T010 [P] [US1] Add gateway tests in `apps/backend/src/app/lobby/lobby.gateway.spec.ts`: `rematch:start` payload validation, host-only, the host receives a `lobby` view with `round` 2, reserved players receive a snapshot view, the games list shows the room as `lobby`
- [x] T011 [US1] Add `rematch()` to `apps/frontend/src/app/core/socket.service.ts`: sends `rematch:start` with `round` of `game()`; on error shows the standard error toast (same pattern as `settings`); add tests to `apps/frontend/src/app/core/socket.service.spec.ts`
- [x] T012 [US1] Add the host button in `apps/frontend/src/app/table/game-over.ts`: for the host with a seat and `rematchState` `waiting`, a primary "Rematch" (`gameOver.rematch`) before the secondary "Back to the lobby", calling `socket.rematch()`; layout from `design.md` (buttons wrap, side by side on desktop); hint line `gameOver.rematchHint`
- [x] T013 [US1] Show the rematch in `apps/frontend/src/app/game-lobby/game-lobby.ts`: a `reserved` seat row (avatar, nickname, tag `gameLobby.reserved` with a `pi-clock` icon, dashed outline via a class) and a tag `gameLobby.rematchRound` ("Rematch · round {round}") next to the title when `round > 1`
- [x] T014 [P] [US1] Add English and German texts `gameOver.rematch`, `gameOver.rematchHint`, `gameLobby.reserved`, `gameLobby.rematchRound`, `log.rematch` in `apps/frontend/src/app/i18n/en.ts` and `apps/frontend/src/app/i18n/de.ts`; render `log.rematch` in `apps/frontend/src/app/core/game-view.ts` log formatting if log kinds are listed there
- [x] T015 [P] [US1] Extend `apps/frontend/src/app/table/table-game-over.spec.ts` : host sees "Rematch" and "Back to the lobby", guest does not see "Rematch", the button calls `rematch()`; extend `apps/frontend/src/app/game-lobby/game-lobby.spec.ts`: reserved seat row and round tag

**Checkpoint**: The host can reopen the room as a lobby (MVP).

---

## Phase 4: User Story 2 - The other players rejoin their seat (Priority: P1)

**Goal**: Waiting players see "Rejoin" (disabled until the host decided, then active) and get their seat back.

**Independent Test**: With two humans in the modal the second sees a disabled "Rejoin" that becomes active after the host's "Rematch"; clicking it shows the lobby with the same seat and name; before that the host sees the seat as reserved.

- [x] T016 [US2] Add `rematchJoin(playerId: string, round: number, language?: UiLanguage): Res<{ seat: number }>` to `apps/backend/src/app/lobby/game-room.ts`: `banned` if banned; `staleRound` unless `round === this.round - 1`; `notRejoinable` unless the player has a `reserved` seat in a `lobby` room; turn the seat into a human seat (`connected=true`, `ready=false`, `timeouts=0`, language updated), `resetReady()`, add `rejoined`, `emit()`; extend `leave()` so a player with a `reserved` seat or in `dropped` is released: the seat becomes `{ state: 'open' }` (reserved) or the id is removed (dropped), `resetReady()`, `ok` ack
- [x] T017 [US2] Add the `rematch:join` handler in `apps/backend/src/app/lobby/lobby.gateway.ts`: validate `round`, no `alreadyInGame` check (the player is still in the room via `session.gameId`), call `room.rematchJoin`, `enter(client, session, room)` is not needed because `session.gameId` is already set; ack `{ game: toView(room, playerId) }`; `pushLobby()`
- [x] T018 [US2] Release reservations on reload in `apps/backend/src/app/lobby/lobby.gateway.ts`: in `session:start`, when the player's room is found but they have no human seat, call `room.leave(session.playerId)` before clearing `session.gameId` (frees a reservation, a no-op otherwise); add the same release when a room is closed: in `closed()` also `exit` every id in `room.watchers()` and send `game:closed` with reason `ended` (for reason `empty` too)
- [x] T019 [P] [US2] Add room tests in `apps/backend/src/app/lobby/game-room.spec.ts`: `rematchJoin` seats the player on the same index, not ready, resets other ready marks; rejects `staleRound`, `notRejoinable` (no reservation, left, removed, started), `banned`; a second `rematchJoin` of the same player is `notRejoinable`; `leave` frees a reservation
- [x] T020 [P] [US2] Add gateway tests in `apps/backend/src/app/lobby/lobby.gateway.spec.ts`: `rematch:join` happy path returns a lobby view and the others get `game:state`; reserved player reloading (`session:start`) gets no `game` and the seat is `open`; closing the room sends `game:closed` to reserved players
- [x] T021 [US2] Add `rejoinRematch()` to `apps/frontend/src/app/core/socket.service.ts`: sends `rematch:join` with the shown game's `round`, sets `game` from the ack on success, shows the error toast otherwise; tests in `apps/frontend/src/app/core/socket.service.spec.ts`
- [x] T022 [US2] Add the guest buttons in `apps/frontend/src/app/table/game-over.ts` per `design.md` and `contracts/rematch-protocol.md`: for a non-host with `rematchState` `waiting` a disabled "Rejoin" with hint `gameOver.waitingForHost` (host name), with `open` an active "Rejoin" (`rejoinRematch()`) and hint `gameOver.seatReserved`, always "Back to the lobby"; the hint is plain text so the disabled state is explained without colour
- [x] T023 [P] [US2] Add English and German texts `gameOver.rejoin`, `gameOver.waitingForHost`, `gameOver.seatReserved` in `apps/frontend/src/app/i18n/en.ts` and `apps/frontend/src/app/i18n/de.ts`
- [x] T024 [P] [US2] Extend `apps/frontend/src/app/table/table-game-over.spec.ts`: guest sees a disabled "Rejoin" with the waiting hint; active after `rematch: 'open'`; click calls `rejoinRematch()`; "Back to the lobby" unchanged

**Checkpoint**: A full rematch with waiting guests works.

---

## Phase 5: User Story 3 - The host starts without waiting for everybody (Priority: P1)

**Goal**: Missing players never block the start; the host can remove waiting players.

**Independent Test**: Three humans finish a game; the host rematches, one guest rejoins; the host starts: the game runs with two humans, the third seat is gone and that player's modal shows only "Back to the lobby".

- [x] T025 [US3] Update `start()` in `apps/backend/src/app/lobby/game-room.ts`: reserved seats are ignored by the minimum-two-players and ready checks; on success turn each `reserved` seat into `{ state: 'open' }`, add their player ids to `dropped`, then `emit()`; the new engine game is created from the remaining occupied seats in seat order
- [x] T026 [US3] Update `removeSeat()` in `apps/backend/src/app/lobby/game-room.ts` to accept a `reserved` seat (not the host's): free it, ban the player, `resetReady()`, return `removed` so the gateway's `removed()` sends `game:closed` with reason `banned` and exits the session (existing path in `apps/backend/src/app/lobby/lobby.gateway.ts`); leave the existing human case unchanged
- [x] T027 [P] [US3] Add room tests in `apps/backend/src/app/lobby/game-room.spec.ts`: start drops reservations and starts with the others in seat order; fewer than two players still fails with `notEnoughPlayers`; dropped ids get `rematch: 'closed'` views; `rematchJoin` after the start is `notRejoinable`; `removeSeat` of a reserved seat frees it, bans the player and `rematchJoin` then fails with `banned`
- [x] T028 [P] [US3] Add gateway tests in `apps/backend/src/app/lobby/lobby.gateway.spec.ts`: after `game:start` a dropped player receives one `game:state` with `rematch: 'closed'` and can still `game:leave`; `seat:remove` of a reserved seat notifies the player with `game:closed` (`banned`)
- [x] T029 [US3] Frontend: in `apps/frontend/src/app/table/game-over.ts` handle `rematchState` `closed` (disabled "Rejoin", hint `gameOver.startedWithoutYou`); in `apps/frontend/src/app/game-lobby/game-lobby.ts` show "Remove this player" (existing `gameLobby.removePlayer`) on reserved seats for the host and a start hint `gameLobby.startDrops` naming the reserved players a start would drop; add the English and German texts in `apps/frontend/src/app/i18n/en.ts` and `apps/frontend/src/app/i18n/de.ts`
- [x] T030 [P] [US3] Extend `apps/frontend/src/app/table/table-game-over.spec.ts` and `apps/frontend/src/app/game-lobby/game-lobby.spec.ts`: closed state, remove button host-only, start stays enabled with reserved seats, start hint lists the names

**Checkpoint**: The rematch flow is complete for any mix of present and absent players.

---

## Phase 6: User Story 4 - A rematch is never confused with the finished game (Priority: P1)

**Goal**: Late requests of an earlier round, leavers and the computer-takeover rejoin never change the current round.

**Independent Test**: A player leaves via "Back to the lobby", the host rematches, the player's old client sends `rematch:join`: rejected, nothing changes. A stale `rematch:start` after a second rematch is rejected.

- [x] T031 [US4] Add the error text `error.staleRound` in `apps/frontend/src/app/i18n/en.ts` and `apps/frontend/src/app/i18n/de.ts` (shown by `errorMessage` through `error.<reason>`); on `staleRound` from either rematch call the service refreshes nothing else (the next push carries the current view)
- [x] T032 [P] [US4] Add room tests in `apps/backend/src/app/lobby/game-room.spec.ts`: `rematch` with an old round is `staleRound`; `rematchJoin` with the round of an older game after a second rematch is `staleRound`; a player who left the finished game before the rematch has no reservation and gets `notRejoinable`; a rejected request leaves seats, `round`, log and `emit` count unchanged; `game:rejoin` (`rejoin()`) cannot take a reserved seat and `rematchJoin` cannot take a computer-held `former` seat
- [x] T033 [P] [US4] Add gateway tests in `apps/backend/src/app/lobby/lobby.gateway.spec.ts`: a stale client (old round) receives `staleRound` for `rematch:start` and `rematch:join` and nobody gets a push; a reconnecting stale client (`session:start`) never receives a finished table of the earlier round; protocol version mismatch (`versionMismatch`) for version 9
- [x] T034 [US4] Add an end-to-end flow in `apps/backend/src/app/lobby/lobby.gateway.e2e.spec.ts` with real sockets and the helper in `apps/backend/src/app/lobby/testing/client.ts`: three clients finish a game, host rematch, one rejoins, one leaves, host starts; assert the second game starts with fresh scores, the leaver is in the games list and the remaining two see only the new game
- [x] T035 [P] [US4] Extend `apps/frontend/src/app/core/socket.service.spec.ts`: a `staleRound` ack shows the error toast and leaves `game()` untouched

**Checkpoint**: The round boundary is enforced and tested at room, gateway and client level.

---

## Phase 7: User Story 5 - Texts and documentation (Priority: P3)

**Goal**: All new texts exist in English and German; documentation and roadmap describe the rematch.

**Independent Test**: Switch the language and read all new texts; the roadmap marks R7 delivered.

- [x] T036 [US5] Verify `apps/frontend/src/app/i18n/i18n.spec.ts` passes with all new keys in both languages and that no key from T014, T023, T029, T031 is missing in `de.ts`
- [x] T037 [P] [US5] Document the rematch in `docs/user-guide.md` and `docs/user-guide.de.md`: a "Rematch" paragraph next to the paragraph on the Game over window (host button, Rejoin, reserved seats, start without absent players, reload and leaving release the seat), and update the sentence in the Leaving paragraph where it applies
- [x] T038 [P] [US5] Update `docs/roadmap.md`: add the row `014 | Rematch in the same room ...` to the delivered table (host-first rematch, reserved seats, round marker, protocol v10), mark R7 as delivered or remove its open items, and keep the R10 presets note
- [x] T039 [P] [US5] Point `CLAUDE.md` "Current feature plan" to `specs/014-rematch-same-room/plan.md`

---

## Phase 8: Polish & Cross-Cutting

- [x] T040 Run `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build`; fix findings
- [x] T041 Verify the manual scenarios of `quickstart.md` with the `verify-ui` skill (host-first rematch, rejoin, absent player, remove, leaver, two tabs, reload)
- [ ] T042 (optional, not run) Check coverage of the changed files against `.specify/memory/test-coverage-guide.md` (`/speckit-coverage`, optional) and, before merging, the SonarQube quality gate (`/speckit-sonar-validate`, optional)

---

## Dependencies & Execution Order

- Phase 1 (T001) before everything; Phase 2 (T002-T006) before the user stories.
- US1 (T007-T015) is the MVP and comes first. US2 needs US1 (a reservation exists only after a rematch). US3 needs US2 for the reserved/dropped flows. US4 needs US1 and US2. US5 can start once the texts exist (T014, T023, T029, T031).
- Inside a story: room (backend) before gateway before client service before UI; tests marked [P] touch different files and can run beside the implementation once the signatures exist.
- `apps/backend/src/app/lobby/game-room.ts` is edited by T002, T007, T016, T025, T026: do these in order. `apps/frontend/src/app/table/game-over.ts` by T012, T022, T029; `apps/frontend/src/app/game-lobby/game-lobby.ts` by T006, T013, T029; the i18n files by T014, T023, T029, T031.

## Parallel Execution Examples

- After T006: T004 and T005 (backend specs) beside T006 (frontend helpers).
- US1: T009, T010 (backend tests) and T014, T015 (texts, frontend tests) after T007, T008, T011, T012.
- US2: T019, T020 (backend tests) beside T021-T024 (frontend).
- Documentation T037-T039 beside US4 tests.

## Implementation Strategy

1. MVP: Phase 1, Phase 2, US1. The host can reopen the room; guests wait on a disabled "Rejoin" that stays disabled (US2 enables it).
2. Add US2 and US3 for the full flow; US4 closes the stale-round cases; US5 documentation.
3. Each story ends with its checkpoint test; run `npx nx test backend` and `npx nx test frontend` after each phase.
