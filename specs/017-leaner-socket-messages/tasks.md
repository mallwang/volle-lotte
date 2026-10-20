---
description: 'Task list for Leaner Socket Messages'
---

# Tasks: Leaner Socket Messages

**Input**: Design documents from `/specs/017-leaner-socket-messages/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/protocol.md](contracts/protocol.md), [quickstart.md](quickstart.md)

**Tests**: Required (constitution III, spec FR-018). Tests are written together with the code of each story and must be green at its checkpoint.

**Organization**: Grouped by user story. The baseline measurement (US1, part 1) MUST run before any protocol change, because it measures the old protocol.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 to US5 from the spec
- Paths are relative to the repository root

---

## Phase 1: Setup and baseline (User Story 1, part 1)

**Purpose**: A reusable measurement that runs against the unchanged protocol, and the recorded baseline.

**Goal (US1)**: Bytes per event type over a full game for 2 and 8 players, with and without spectators.

**Independent Test**: `npm run measure:socket -- --label baseline` prints one table per scenario and writes `tmp/socket-traffic/baseline.json`.

- [x] T001 [US1] Add `apps/backend/jest.measure.config.cts` (copy of `jest.e2e.config.cts`, `testMatch` for `**/*.measure.ts`), a backend target `measure-socket` in `apps/backend/project.json` (`nx:run-commands`, `jest -c jest.measure.config.cts --runInBand`, `cache: false`, label from env `MEASURE_LABEL`, default `run`), and the root script `"measure:socket": "nx run backend:measure-socket"` in `package.json` that maps `--label <x>` to `MEASURE_LABEL`
- [x] T002 [US1] Write `apps/backend/src/app/lobby/testing/traffic.ts`: a `Meter` that wraps a `Client` (from `testing/client.ts`) and records, per received event name, the count and the byte length of `JSON.stringify([event, payload])` (the Socket.IO text frame body) and of every ack; role is `player` or `spectator`; keeps the series of sizes per event in arrival order. It MUST NOT depend on event names of the new protocol (it counts whatever arrives), so the same script measures old and new
- [x] T003 [US1] Write `apps/backend/src/app/lobby/testing/autoplay.ts`: a scripted human player that decides from the server-side room (`registry()` from `testing/client.ts`), not from pushes, so it works with every protocol version: when it is its turn and the phase needs it, send `turn:action` with `draw`, then `select` the scoring dice, then `bank` once the run reaches the minimum, else `throw`; deterministic with a seeded `rng` and `nameRng` passed to the room, computer speed 5 and `fastComputerDice` on, so a game ends in seconds
- [x] T004 [US1] Write `apps/backend/src/app/lobby/measure/socket-traffic.measure.ts`: scenarios `2 players`, `2 players + 2 spectators`, `8 players`, `8 players + 2 spectators` (one autoplay human, the other seats computers or idle humans that only listen, spectators join after the third turn and one of them reloads/rejoins once), plays each game to the end, prints a table (event, role, count, total, average, max bytes) and the size series of the largest event, and writes `tmp/socket-traffic/<label>.json` in the format of `data-model.md` (Measurement report)
- [x] T005 [US1] Run `npm run measure:socket -- --label baseline` on the unchanged protocol, check that the numbers are plausible (the size of `game:state` grows with the log), and write `docs/socket-traffic.md` with a short "How to measure" section and the baseline tables (copy from the output; the JSON stays in `tmp/`)
- [x] T006 [US1] Add the measurement files to the coverage skip list: `sonar.coverage.exclusions` in `sonar-project.properties` (`**/testing/traffic.ts`, `**/testing/autoplay.ts`, `**/measure/**`) and the skip list in `.specify/memory/test-coverage-guide.md`

**Checkpoint**: Baseline recorded and committed; the measurement can be run at any time.

---

## Phase 2: Foundational (blocking prerequisites for US2 to US4)

**Purpose**: Shared types, the pure diff/apply pair and the per-recipient cache. Nothing is sent differently yet.

- [ ] T007 Update `libs/game-rules/src/lib/protocol.ts`: `PROTOCOL_VERSION = 12`; add `n: number` to `GameView` (doc: running number of the last change the view contains, per recipient); `GameStateView = Omit<GameState, 'deck' | 'rules'> & { deckSize: number }`; add the `GameChange` type with exactly the parts of `data-model.md` (`you`, `hostId`, `phase`, `rematch`, `seats: [number, SeatView][]`, `game`, `preview`, `turnDeadline`, `settings`, `spectators`, `paused`, `log`, required `n`); in `Pushes` replace `game:state` and `game:log` by `game:snapshot: { game: GameView }` and `game:change: GameChange`; add intent `game:sync: [undefined, { game: GameView }]`; export `LOG_CAP` (moved from `apps/backend/src/app/lobby/game-room.ts`, which then imports it)
- [ ] T008 [P] Write `libs/game-rules/src/lib/view-sync.ts` with pure `diffView(prev: GameView, next: GameView): GameChange-without-n | 'snapshot' | null` and `applyChange(view: GameView, change: GameChange): GameView` exactly as in `contracts/protocol.md` ("What counts as structural", parts and clearing with `null`): `seats` as index pairs, `settings` only with changed fields, `log` = entries between `prev.logBase + prev.log.length` and the same of `next`, `applyChange` appends, trims to `LOG_CAP` and raises `logBase`, never mutates its input; `diffView` returns `'snapshot'` when `round`, `id`, `name` or `rules` differ, when the log would shrink or `logBase` moves backwards, or when `you.spectator` flips; export from `libs/game-rules/src/index.ts`
- [ ] T009 [P] Write `libs/game-rules/src/lib/view-sync.spec.ts`: round trip `applyChange(prev, diffView(prev, next)) = next` (deep equal, `n` aside) for lobby (seat set, ready, rename, settings), running (throw, select, bank, preview, timer start/stop, pause), seat takeover by a computer, host change, spectator count, finished, waiting-player view and `rematch` open/closed; an unchanged view gives `null`; structural cases give `'snapshot'`; log append, log cap (`LOG_CAP + 3` entries added: `logBase` rises by 3), input not mutated; a table-driven generator that applies 200 random mutations to a base view and checks the round trip after each
- [ ] T010 Write `apps/backend/src/app/lobby/view-sync.service.ts`: `ViewSyncService` with per room `Map<playerId, { view, n }>` (view without log, plus `logEnd`); `snapshot(room, playerId): GameView` builds `toView(...)`, registers the entry with the current counter (`n` starts at 0 on first registration, otherwise keeps counting) and returns the view with `n`; `changes(room): { playerId, kind: 'change' | 'snapshot', payload }[]` runs `diffView` for every entry, increments `n` only when something is sent; `forget(room, playerId)` and `dispose(roomId)`; no socket code inside (testable without sockets)
- [ ] T011 [P] Write `apps/backend/src/app/lobby/view-sync.service.spec.ts`: first `snapshot` gives `n` 0 and registers; unchanged room gives no message and the counter stays; one change gives `n + 1`; two recipients count independently; a recipient without entry gets nothing; `forget`/`dispose` clean up; a rematch gives `kind: 'snapshot'`
- [ ] T012 Update `apps/backend/src/app/lobby/view.ts`: `withoutDeck` drops `rules` too; `toView` and `waitingView` set `n: 0` (the service overwrites it); adjust `view.spec.ts`
- [ ] T013 Update all places that read `game.game.rules` to read `game.rules`: `apps/frontend/src/app/table/table.ts` (two places near `minimumPoints`), found by `npm run typecheck`, plus the affected specs

**Checkpoint**: `libs/game-rules`, backend service and view helpers compile and their tests pass; the gateway still sends the old events (not yet switched), so the app is temporarily inconsistent until Phase 3 is merged. Do not release between Phase 2 and Phase 3.

---

## Phase 3: User Story 2 - Small, named changes during a game (Priority: P1)

**Goal**: After a snapshot, a running game sends only `game:change` messages with the changed parts.

**Independent Test**: Play a long 8-player game: a turn message early and late in the game has about the same size, contains no seat names and no log beyond the new entry; the table, the log and the names look as before in all clients.

- [ ] T014 [US2] Update `apps/backend/src/app/lobby/lobby.gateway.ts`: inject `ViewSyncService`; `push(room)` (no `entries` argument needed) sends, for every entry returned by `changes(room)`, `game:change` or `game:snapshot` to the socket of that player (players, former players, waiting players and spectators alike); remove the `game:state` and `game:log` emits; keep the lobby summary logic; update `GameRegistryService.onChange` typing in `game-registry.service.ts` to ignore the entries argument
- [ ] T015 [US2] In the same gateway, return `viewSync.snapshot(room, playerId)` instead of `toView(...)` in every ack that returns a game: `session:start`, `game:create`, `game:join`, `game:spectate`, `game:rejoin`, `rematch:join`; call `forget` in `exit`, `leave`, `game:closed` paths, when a spectator is evicted, and `dispose` when a room is removed
- [ ] T016 [US2] Update `apps/frontend/src/app/core/socket.service.ts`: replace the `game:state` handler by `game:snapshot` (set the game and `lastN = game.n`) and `game:change` (apply when `n === lastN + 1` using `applyChange`, ignore `n <= lastN`; a gap is handled in US4), and set `lastN` whenever an ack returns a game (`start`, `replay`, create, join, spectate, rejoin, `rematch:join`); clear `lastN` where `game` is set to `null`
- [ ] T017 [US2] Verify `apps/frontend/src/app/table/table.ts` still works with an in-place appended log (the `seen` cursor and `logBase` logic near `logEnd`); add a test in `table.spec.ts` that feeds a snapshot and then `game:change` messages with `log` entries through `SocketService` and expects the revealed log, the dice animation and the game-over trigger to behave as with the old full state
- [ ] T018 [P] [US2] Migrate the backend tests that waited for `game:state` or `game:log` to the new events: `lobby.gateway.spec.ts`, `lobby.gateway.spectators.spec.ts`, `lobby.gateway.e2e.spec.ts` (use `until('game:change', ...)` or read the change payload); the spectator test of spec 016 (join/leave raise only the counter) now expects exactly one `game:change` with only `{ n, spectators }` per participant
- [ ] T019 [P] [US2] Add gateway tests in `lobby.gateway.spec.ts`: (a) a throw produces a `game:change` for every participant incl. spectators with `log` of exactly the new entries and without `seats`, `rules`, `name`, `hostId`; (b) `turn:preview` produces only `{ n, preview }` (no `log`, no `game`); (c) a computer takeover, rename and host handover produce a `seats` (and `hostId`) part that all clients, incl. spectators, apply; (d) the size of a turn message after 300 log entries is within 10% of the first one (SC-001); (e) `settings`, `paused` and `spectators` changes carry only their part
- [ ] T020 [P] [US2] Update `apps/frontend/src/app/core/socket.service.spec.ts`: all former `game:state` pushes become `game:snapshot` or `game:change`; a `game:change` with `seats`, `game`, `log`, `settings` updates the signal as the reducer says; a change with `n <= lastN` is ignored; the toast behaviour of `game:settingsChanged` is unchanged

**Checkpoint**: US2 works end to end; run `npm run measure:socket -- --label after-us2` and compare with the baseline (expect the large drop).

---

## Phase 4: User Story 3 - Complete snapshot when entering (Priority: P1)

**Goal**: Join, rejoin, reload, watch and rematch always end with a complete view; waiting players get one small message.

**Independent Test**: In a running game with a long log, rejoin, reload, start watching and trigger a rematch: each time the client shows all names, the full log and the current state and then follows the game live.

- [ ] T021 [US3] In `apps/backend/src/app/lobby/lobby.gateway.ts` and `game-room.ts`, verify that the start of a rematch and `rematch:join` reach every recipient with `game:snapshot` (incl. spectators, who are evicted with `game:closed` per spec 016 and need no snapshot) and that a waiting player's `rematch` open/closed arrives as a `game:change { rematch }` while their reload takes the snapshot path (`waitingView`); fix `diffView` structural rules in `view-sync.ts` if a case does not match
- [ ] T022 [P] [US3] Add gateway integration tests (new file `apps/backend/src/app/lobby/lobby.gateway.snapshot.spec.ts`) for the resync paths: rejoin after a socket drop with changes in between (ack snapshot has all names, the complete log and an `n` that the next change continues); reload (`session:start` with token); spectator start in a game with 300 log entries; rematch start (everybody, who stays, gets `game:snapshot` with the new round and empty-or-new log); waiting player gets `game:change { rematch: 'open' }` and then reloads into the finished view; the player removed by the next game gets `rematch: 'closed'`
- [ ] T023 [P] [US3] Add frontend tests in `socket.service.spec.ts`: an ack with a game sets `lastN`; `game:snapshot` replaces the view; after a rematch snapshot the next change with `n + 1` is applied; leaving the game clears the state so a late change is ignored
- [ ] T024 [US3] Check `apps/frontend/src/app/game-lobby/game-lobby.ts`, `apps/frontend/src/app/game/game.ts` and `apps/frontend/src/app/app.ts` for assumptions about `game:state` arrival (for example redirects after join, game-over modal on `phase` change) and fix what a `game:change` without `phase` or with only some parts breaks; cover with a component test where the logic is non-trivial

**Checkpoint**: US3 works; all entering paths return complete snapshots.

---

## Phase 5: User Story 4 - A missed change is noticed and repaired (Priority: P1)

**Goal**: A gap or a missing view makes the client ask for its own snapshot; nobody else is disturbed.

**Independent Test**: Drop or delay a change for one client: it detects the gap, calls `game:sync`, shows the same table as the others; others see nothing; a duplicate change is applied once.

- [ ] T025 [US4] Add the `game:sync` handler in `apps/backend/src/app/lobby/lobby.gateway.ts`: needs a session (`noSession`), a seat or spectator membership in a game (`notInGame`), returns `{ ok: true, game: viewSync.snapshot(room, playerId) }`; rate limit 5 per 10 seconds per session (extend `attempt-limiter.ts` with a small `RateLimiter` or reuse it with the session id as key) answering `locked` with `retryAfterMs`; no push to other clients
- [ ] T026 [US4] Update `apps/frontend/src/app/core/socket.service.ts`: on `game:change` with `n > lastN + 1`, or when there is no `game`, send `game:sync` once (flag `syncing`), drop all changes while it is pending, apply the ack as a snapshot (`lastN = game.n`); on an error ack with `notInGame`/`gameNotFound` reset to the lobby with the same notice as a failed rejoin; if a dropped change was newer than the snapshot, the next change shows a gap and a new sync follows (research D8)
- [ ] T027 [P] [US4] Add backend tests (in `lobby.gateway.snapshot.spec.ts`): `game:sync` returns the same view a fresh `game:rejoin` would, with the current `n`, to a player and to a spectator; a non-member gets `notInGame`; the 6th call within 10 seconds gets `locked`; the other clients get no message from a sync; after a sync the next change has `n + 1`
- [ ] T028 [P] [US4] Add frontend tests in `socket.service.spec.ts`: snapshot 50 then change 60 sends exactly one `game:sync` and applies nothing; changes arriving while the sync is pending are dropped; the ack snapshot (n 60) is applied and change 61 follows; a change 49/50 after a snapshot of 50 is ignored; two quick gaps send one sync at a time; error ack leaves the game cleanly (SC-005)
- [ ] T029 [US4] Add one end-to-end style test in `lobby.gateway.snapshot.spec.ts` that mimics a lost message: a real socket client skips applying one `game:change` (test hook in the test client), then applies the next, syncs, and its view equals the view of an undisturbed client within one second

**Checkpoint**: US4 works; the failure mode "wrong table" is covered by tests.

---

## Phase 6: User Story 5 and measurement result (Priority: P3)

**Goal**: Numbers after the change and recorded decisions.

**Independent Test**: `docs/socket-traffic.md` has baseline and result tables and the decisions; the roadmap is updated.

- [ ] T030 [US1] Run `npm run measure:socket -- --label after` for the final protocol; check SC-001 (late vs early turn message within 10%), SC-002 (at least 70% less per player over an 8-player game) and SC-003 (spectators at least as much); if a goal is missed, note the reason and the biggest remaining event in `docs/socket-traffic.md` and decide in T031
- [ ] T031 [US5] Extend `docs/socket-traffic.md` with the result tables, the figures against SC-001 to SC-003 and, for compression (`perMessageDeflate`), binary encoding (MessagePack) and finer or generic diffs, one decision each (dropped, postponed or planned separately) with the figures that justify it
- [ ] T032 [US5] Update `docs/roadmap.md`: mark R24 done in spec 017 with a short summary (snapshot plus `game:change`, running numbers, `game:sync`, measurement tool), the measured savings and the three decisions; link `docs/socket-traffic.md`; remove or reword the bullets that are now implemented; if a separate item is planned, add it as a new roadmap entry
- [ ] T033 [P] [US5] Update documentation that names the old events: search `docs/`, `README.md` and `specs/016-spectators` references only if they describe current behaviour (history stays); mention `npm run measure:socket` where scripts are documented

---

## Phase 7: Polish and cross-cutting

- [ ] T034 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e` (manual, slow flows via the `run-e2e` skill); fix findings
- [ ] T035 [P] Run the manual check of `quickstart.md` section 4 with the `verify-ui` skill (three windows: two players and a spectator; reload, offline throttle, rematch) and note the result in the PR description
- [ ] T036 [P] Run `/speckit-coverage` and the Sonar steps (`/speckit-sonar-local`, then `/speckit-sonar-validate` on the PR); the new code (`view-sync.ts`, `view-sync.service.ts`, gateway, `socket.service.ts`) must stay at 80% or more
- [ ] T037 Check the PWA update behaviour: the protocol version 12 is reported by the backend, an open old client in the lobby or after a game updates, nobody is updated mid-game (constitution IV); add or adjust the test next to the existing `versionMismatch` test in `lobby.gateway.spec.ts`

---

## Dependencies and execution order

- **Phase 1** first and alone: it measures the old protocol. T001 → T002/T003 (parallel) → T004 → T005; T006 any time after T004.
- **Phase 2** after the baseline is committed. T007 first; T008 and T009 in parallel after T007; T010 after T008; T011 after T010; T012 and T013 after T007.
- **Phase 3** (US2) needs Phase 2. T014 → T015 → T016 → T017; T018, T019, T020 in parallel after T016.
- **Phase 4** (US3) needs Phase 3 (shares the gateway and the service). T021 → T024; T022 and T023 in parallel.
- **Phase 5** (US4) needs Phase 3; independent of Phase 4 except for shared files (`socket.service.ts`, `lobby.gateway.snapshot.spec.ts`): do T025 → T026, then T027, T028, T029.
- **Phase 6** needs Phases 3 to 5 (the measurement must run on the final protocol).
- **Phase 7** last.

```text
Phase 1 (baseline) -> Phase 2 (types, diff/apply, cache) -> Phase 3 (US2) -+-> Phase 4 (US3) -+-> Phase 6 -> Phase 7
                                                                           \-> Phase 5 (US4) -/
```

## Parallel examples

- Phase 1: T002 (`testing/traffic.ts`) and T003 (`testing/autoplay.ts`) at the same time.
- Phase 2: T008 (`view-sync.ts`) with T009 (its spec) written together; T012 and T013 alongside T010.
- Phase 3: T018, T019 and T020 are different spec files.

## Implementation strategy

- **MVP**: Phases 1 to 3 plus the entering paths of Phase 4 (T021, T022) deliver the main saving, because `game:state` can only be removed when all entering paths and structural cases give a snapshot. Phase 5 (gap repair) MUST land before release: without it a lost message shows a wrong table (the reason for FR-009 to FR-011).
- **Order of risk**: Phase 2 (round-trip test) carries the correctness argument; if T009 is green for all cases and the random generator, Phases 3 to 5 are wiring and tests.
- **Measure at the checkpoints**: after Phase 3 (`after-us2`) and at the end (`after`); only the final figures are written into the docs.
- **Release**: one release with protocol version 12; no mixed old and new clients (existing update rule).
