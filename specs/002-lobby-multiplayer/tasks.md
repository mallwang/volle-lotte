# Tasks: Lobby and multiplayer

**Input**: Design documents from `/specs/002-lobby-multiplayer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/socket-protocol.md, quickstart.md

**Tests**: Included. The constitution (principle III), the plan and quickstart.md require unit tests and socket integration tests.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 create/join (P1), US2 game lobby (P1), US3 play turns (P1), US4 leave/disconnect (P2)
- Backend paths are under `apps/backend/src/app/lobby/` (written `lobby/` below), frontend paths under `apps/frontend/src/app/`, shared code under `libs/game-rules/src/`.

## Phase 1: Setup

- [x] T001 Add `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` to `apps/backend/package.json` and `socket.io-client` to `apps/frontend/package.json` (also as devDependency of the backend for integration tests); run `npm install` and commit the lockfile
- [x] T002 Create wire types (intents, `Ack<T>`, `ErrorReason`, `GameView`, `SeatView`, `GameSummary`, `LogEntry`, `PROTOCOL_VERSION = 1`) in `libs/game-rules/src/lib/protocol.ts` per data-model.md and contracts/socket-protocol.md; export from `libs/game-rules/src/index.ts`

---

## Phase 2: Foundational (blocks all user stories)

- [x] T003 [P] Implement scrypt `hashPassword`/`verifyPassword` (16-byte salt, `salt:hash` base64, `timingSafeEqual`) in `apps/backend/src/app/lobby/password.ts` with `password.spec.ts`
- [x] T004 [P] Implement the attempt limiter (5 failures in 10 min per clientKey+gameId, 10 min lock, success clears, injectable clock) in `apps/backend/src/app/lobby/attempt-limiter.ts` with `attempt-limiter.spec.ts`
- [x] T005 [P] Implement `SessionsService` (token 32 bytes hex, public playerId 8 bytes hex, nickname validation 2-20 `[A-Za-z0-9 _-]` trimmed, resume by token, one active socket per token, 24 h sweep of idle sessions) in `apps/backend/src/app/lobby/sessions.service.ts` with `sessions.service.spec.ts`
- [x] T006 [P] Implement `GameRoom` core (8 seats, locked beyond the chosen count, host, phase, capped 500-entry log with `LogKind`s, seat take/free, case-insensitive nickname check, serializable state; no timers yet) in `apps/backend/src/app/lobby/game-room.ts` with `game-room.spec.ts`
- [x] T007 [P] Implement `toGameView(room, playerId)` (strips `deck` to `deckSize`, keeps `random` difficulty as `random`, never exposes token, hash or client key) in `apps/backend/src/app/lobby/view.ts` with `view.spec.ts`
- [x] T008 Implement `GameRegistryService` (Map of rooms, create/get/list/remove, summaries for the lobby list) in `apps/backend/src/app/lobby/game-registry.service.ts` with `game-registry.service.spec.ts` (depends on T003-T006)
- [x] T009 Implement `LobbyGateway` skeleton and `LobbyModule` (`session:start` with `versionMismatch`/`invalidNickname`, `noSession` guard for all other events, structural payload validation returning `invalidRequest`, ack helpers, no secrets in logs) in `apps/backend/src/app/lobby/lobby.gateway.ts` and `lobby.module.ts`; import the module in `apps/backend/src/app/app.module.ts` (depends on T005, T008)
- [x] T010 Create the integration harness (Nest testing app on a random port, `socket.io-client` helper that connects, starts a session and awaits events/acks) and first tests for `session:start` in `apps/backend/src/app/lobby/lobby.gateway.spec.ts`
- [x] T011 [P] Implement `SocketService` (connection, token in localStorage under one key, signals `session`, `games`, `game`, `connection`, ack-returning methods, replays `session:start` on reconnect) in `apps/frontend/src/app/core/socket.service.ts` with `socket.service.spec.ts`
- [x] T012 [P] Add routes and a session guard (no session leads to the nickname screen) in `apps/frontend/src/app/app.routes.ts` for `nickname`, `lobby`, `create-game`, `game/:id` (lobby and table views)

**Checkpoint**: backend accepts sessions over Socket.IO, frontend can connect; user stories can start.

---

## Phase 3: User Story 1 - Create and join a password-protected game (P1) 🎯 MVP

**Goal**: A person gets an anonymous session, creates a game with password, seats and rules, and others join with the password.

**Independent Test**: Two clients create and join a game; a wrong password is refused with `attemptsLeft`, the sixth attempt is `locked` even with the right password, the right password seats the second player, and both see each other. A returning token restores the session.

### Tests for User Story 1

- [x] T013 [US1] Integration scenario 1 in `lobby/lobby.gateway.spec.ts`: create with password, wrong then right password, `attemptsLeft`, lock after 5 failures (also with the correct password), `gameFull`, `nicknameTaken` (case-insensitive), no password or token in captured log output (SC-006)
- [x] T014 [US1] Integration scenario 6 in `lobby/lobby.gateway.spec.ts`: resume with the stored token restores nickname and seat; a second connection with the same token sends `session:replaced` to the first and disconnects it (FR-023)

### Implementation for User Story 1

- [x] T015 [US1] Add create/join to `lobby/game-registry.service.ts` and `lobby/game-room.ts`: validate name 1-40, password 4-64, seats 2-8, `rulesError(rules) === null`; hash the password; creator becomes host; join checks phase, free seat (`seatNotFree`, `gameFull`), nickname uniqueness and password via the limiter; one game per session (`alreadyInGame`); extend the unit specs
- [x] T016 [US1] Add `lobby:list`, `game:create`, `game:join` and the `lobby:games` push to sessions not in a game in `lobby/lobby.gateway.ts`; derive clientKey from the first `x-forwarded-for` hop, else the socket address; `game:state` push to the game's seats on join
- [x] T017 [P] [US1] Nickname screen (form, validation messages from `ErrorReason`, 44 px targets, keyboard operable) in `apps/frontend/src/app/nickname/`
- [x] T018 [P] [US1] Main lobby screen (open games with name, host, seat usage, padlock; password prompt on join; attempts-left and lock-countdown messages) in `apps/frontend/src/app/lobby/`
- [x] T019 [P] [US1] Create-game screen (name, password, seats 2-8, rules with defaults from docs/rules.md) in `apps/frontend/src/app/create-game/`
- [x] T020 [US1] Component specs for the nickname, lobby and create-game screens (validation and error rendering) next to each component

**Checkpoint**: US1 works alone (MVP): sessions, create, list, join with password.

---

## Phase 4: User Story 2 - Prepare the game in the game lobby and start it (P1)

**Goal**: Host manages seats and computers, humans ready up, host starts when everyone is ready.

**Independent Test**: With three players in a lobby the host cannot start until all humans are ready; after the last Ready the host starts and all clients switch to the running game. Seats beyond the count are locked; occupied seats cannot be locked.

### Tests for User Story 2

- [x] T021 [US2] Integration scenario 2 in `lobby/lobby.gateway.spec.ts`: padlock beyond the count, lock/enable, `seatOccupied`, human to computer with difficulty, ready and unready, readiness reset when the seat set changes, `notReady`, `notEnoughPlayers`, `notHost`, successful start

### Implementation for User Story 2

- [x] T022 [US2] Add to `lobby/game-room.ts`: seat modes `open`/`locked`/`computer` (server-only `effective` level, `random` resolved once), `setReady`, readiness reset on seat changes, start gating (>= 2 occupied, all humans ready); extend `game-room.spec.ts`
- [x] T023 [US2] Add `seat:set`, `seat:ready`, `game:start` to `lobby/lobby.gateway.ts`; on start create the engine state from `libs/game-rules` with the seated players in seat order, set phase `running`, add a `started` log entry, broadcast `game:state`
- [x] T024 [P] [US2] Game lobby screen (seats with human/computer/empty/locked, ready toggle, host controls for lock, enable, computer and difficulty, start button disabled until allowed) in `apps/frontend/src/app/game-lobby/`
- [x] T025 [US2] Component spec for the game lobby (host versus non-host controls, start gating) next to the component

**Checkpoint**: US1 and US2 work; a game can be started.

---

## Phase 5: User Story 3 - Play turns online (P1)

**Goal**: Server-authoritative turns for humans and computers, identical state for everyone, ranking at the end.

**Independent Test**: Two clients play a full game to the ranking; both always see the same state; out-of-turn and illegal actions return a reason and change nothing.

### Tests for User Story 3

- [x] T026 [P] [US3] Computer strategy tests with seeded rng in `libs/game-rules/src/lib/computer.spec.ts`: always returns an action contained in `legalActions`, bank thresholds per difficulty (easy 300, medium 450 never with >= 5 free dice, hard 650 never with >= 4), hard takes a Volle Lotte when available
- [ ] T027 [US3] Integration scenarios 3, 4 and 8 in `lobby/lobby.gateway.spec.ts`: full game with 2 and with 8 clients (computers included) to a ranking with identical state for all clients and delivery well under 1 s (SC-002, SC-005); `notYourTurn`, `rejected` with `engine` reason, duplicate action, no push and no state change on rejection (SC-003); two parallel games stay independent (SC-007)

### Implementation for User Story 3

- [x] T028 [P] [US3] Implement pure `chooseAction(state, difficulty, rng)` built on `legalActions` in `libs/game-rules/src/lib/computer.ts`; export from `libs/game-rules/src/index.ts`
- [x] T029 [US3] Add `applyAction` handling to `lobby/game-room.ts`: active-seat check (`notYourTurn`), `paused` guard, dice and deck through `crypto.randomInt`, engine events to the log, `gameOver` sets phase `finished` with ranking (equal scores share a rank); extend `game-room.spec.ts`
- [x] T030 [US3] Add computer pacing to `lobby/game-room.ts`: after 700-1400 ms call `chooseAction` then the same `applyAction` path, reject client actions for computer seats, clear timers on dispose; extend `game-room.spec.ts` with fake timers
- [x] T031 [US3] Add `turn:action` to `lobby/lobby.gateway.ts` and push `game:state` plus `game:log` to every connected seat after each accepted action (FR-016); nothing is pushed on rejection
- [x] T032 [P] [US3] Table screen (scores, active player, dice and selection, throw/select/bank controls, deck size only, event log) in `apps/frontend/src/app/table/`
- [x] T033 [P] [US3] Result screen (final ranking with shared ranks, back to lobby) in `apps/frontend/src/app/result/`, plus component specs for table and result

**Checkpoint**: a complete game can be played by humans and computers.

---

## Phase 6: User Story 4 - Handle players who leave or disconnect (P2)

**Goal**: Disconnects are warned and logged, reconnect within 60 s restores the seat, then the host decides; abandoned games are cleaned up.

**Independent Test**: Close a player's tab mid-game; others see a warning; reopening within 60 s restores seat and turn; waiting longer shows the host the computer/free decision and pauses that player's turn.

### Tests for User Story 4

- [ ] T034 [US4] Integration scenarios 5 and 7 in `lobby/lobby.gateway.spec.ts` (fake timers): disconnect warning and log entry, reconnect inside 60 s restores the exact state (SC-004), expiry leads to `pending` and pause, `host:decide` computer and free, `nothingPending`, deliberate `game:leave`, host handover, lobby cleanup after 15 min and running cleanup after 24 h with `game:closed`, reconnect cancels cleanup

### Implementation for User Story 4

- [x] T035 [US4] Add disconnect handling to `lobby/game-room.ts`: `connected = false`, per-disconnect 60 s grace timer, `graceEndsAt`, reconnect restores seat, expiry moves the seat to `pending` and pauses the game when it is that seat's turn; log entries `disconnected`, `reconnected`, `waitingForHost`; extend `game-room.spec.ts`
- [x] T036 [US4] Add leave, `host:decide` and host handover to `lobby/game-room.ts`: deliberate leave skips the grace period, decision `computer` keeps the engine score and takes over from the next turn, `free` opens the seat, host moves to the next connected human by seat order, log `left`, `hostDecided`, `hostChanged`; extend `game-room.spec.ts`
- [x] T037 [US4] Add cleanup timers to `lobby/game-registry.service.ts`: 15 min for a lobby and 24 h for a running game with no connected human, cancelled by any reconnect, then remove the room and push `game:closed`; extend `game-registry.service.spec.ts`
- [x] T038 [US4] Add `handleDisconnect`, `game:leave`, `host:decide` and seat resume on `session:start` (ack carries `game`) to `lobby/lobby.gateway.ts`
- [x] T039 [P] [US4] Disconnect banner with 60 s countdown and the host decision controls (computer with difficulty, free seat) in `apps/frontend/src/app/table/` and `apps/frontend/src/app/game-lobby/`
- [x] T040 [US4] Handle reconnect, `session:replaced` and `game:closed` in `apps/frontend/src/app/core/socket.service.ts` (clear message after a server restart, return to the nickname screen or lobby)
- [x] T041 [US4] Component and service specs for the banner, host decision and reconnect handling next to the changed files

**Checkpoint**: all four stories work; disconnects and abandoned games are handled.

---

## Phase 7: Polish & cross-cutting

- [x] T042 [P] Update `docs/migration.md` status and the root `README.md` (lobby and multiplayer implemented, new dependencies, protocol version)
- [x] T043 [P] Fix the stale nickname-collision note in `specs/002-lobby-multiplayer/checklists/requirements.md`
- [x] T044 Run `npm run typecheck`, `npm run test` and `npm run lint`; fix findings and keep the coverage thresholds green (bootstrap files stay on the skip list)
- [x] T045 Walk through the manual run in `specs/002-lobby-multiplayer/quickstart.md` with two browser windows (covered by the backend e2e flows; UI part moves to the Playwright suite, roadmap R2)

---

## Dependencies & Execution Order

- Setup (T001-T002) first. Foundational (T003-T012) blocks all stories.
- Inside Foundational: T003-T007 are parallel; T008 needs T003-T006; T009 needs T005 and T008; T010 needs T009; T011 and T012 are parallel to the backend work.
- US1 needs Foundational only. US2 needs US1 (a joined game to prepare). US3 needs US2 (start creates the engine state); T026 and T028 (computer strategy) need only Setup and can start earlier. US4 needs US3 for the mid-game cases and US2 for lobby cases.
- Within a story: tests first (they should fail), then room/registry logic, then the gateway, then the frontend.
- Polish after all desired stories.

## Parallel Examples

```text
Foundational: T003 password.ts, T004 attempt-limiter.ts, T005 sessions.service.ts, T006 game-room.ts, T007 view.ts, T011 socket.service.ts, T012 routes
US1 frontend: T017 nickname, T018 lobby, T019 create-game (after T016)
US3: T026 + T028 computer strategy (in libs/game-rules) alongside T029 room logic; T032 table + T033 result
```

## Implementation Strategy

- **MVP**: Setup, Foundational and US1 (create and join with password). Stop and validate with two browsers.
- **Playable game**: add US2 and US3 (all P1); this is the first end-to-end playable increment.
- **Robust online play**: add US4 (P2), then Polish.
- Commit after each task or logical group; every story ends at its checkpoint with its integration scenario green.
