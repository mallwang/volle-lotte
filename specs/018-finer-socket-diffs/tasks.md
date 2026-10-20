---
description: 'Task list for Finer Socket Diffs and Compact Log'
---

# Tasks: Finer Socket Diffs and Compact Log

**Input**: Design documents from `/specs/018-finer-socket-diffs/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/protocol.md](contracts/protocol.md), [quickstart.md](quickstart.md)

**Tests**: Required (constitution III, spec FR-016). Tests are written together with the code of each story and must be green at its checkpoint.

**Organization**: Grouped by user story. The v12 measurement (Phase 1) MUST run before any protocol change. The measurement after Stories 1 to 3 (US5) decides whether Story 4 is built (FR-012).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 to US5 from the spec
- Paths are relative to the repository root. Run node tools with `~/.nvm/versions/node/v24.22.0/bin` on `PATH` in this environment.

---

## Phase 1: Baseline of version 12

**Purpose**: Figures of the unchanged protocol with the same script and seed, so the savings per story can be shown.

- [ ] T001 Run `npm run measure:socket -- --label v12` on the unchanged code and keep `tmp/socket-traffic/v12.json` (git-ignored). Check the totals against the "Result (protocol 12)" table in `docs/socket-traffic.md` (98,121 bytes per player with 2 players, 369,458 with 8); if they differ by more than 1%, note the reason in the PR and use the new numbers as the comparison
- [ ] T002 Add the 4-player card draw as a size check in `apps/backend/src/app/lobby/lobby.gateway.changes.spec.ts`: a test "a card draw change in a 4-player game stays small" that starts a 4-player game, lets the first player draw and measures `JSON.stringify(['game:change', payload]).length` of the draw change. For now assert it is below 800 (v12 value in the recording: 747); T012 tightens the bound to 300

**Checkpoint**: v12 figures exist; nothing changed in the protocol yet.

---

## Phase 2: Foundational (blocking for US1 to US3)

**Purpose**: The version number and the shared wire types. Nothing is sent differently yet.

- [ ] T003 Update `libs/game-rules/src/lib/protocol.ts`: `PROTOCOL_VERSION = 13`; add the type `GameStateDiff` of `data-model.md` (`players?: [number, { name?: string; score?: number }][]`, `current?: number`, `turn?: Partial<Turn> | null`, `result?: Result | null`, `deckSize?: number`; at least one key) and the optional key `gameDiff?: GameStateDiff` in `GameChange`. Keep `game?: GameStateView | null` and update its doc comment (whole state only when the recipient has none; `null` = no game). The wire log types and the partial `you` are added by the stories that need them (T013, T021), so the repository compiles after every task
- [ ] T004 Update `libs/game-rules/src/lib/protocol.spec.ts` and any test that pins `PROTOCOL_VERSION` or the number 12 (`grep -rn "PROTOCOL_VERSION\|protocolVersion: 12"`) for version 13; run `npx nx test game-rules`

**Checkpoint**: Version 13 and the diff type exist; nothing is sent differently yet.

---

## Phase 3: User Story 1 - A turn message carries only what changed (Priority: P1)

**Goal**: `gameDiff` replaces the repeated `game` part (FR-001 to FR-004, SC-001, SC-004).

**Independent Test**: a card draw change in a 4-player game has no player name or score and is at least 60% smaller than 747 bytes; the round-trip test over simulated games passes.

- [ ] T005 [P] [US1] Write `libs/game-rules/src/lib/game-diff.ts` with pure `diffGame(prev: GameStateView, next: GameStateView): GameStateDiff | 'structural' | null` and `applyGameDiff(prev: GameStateView, diff: GameStateDiff): GameStateView`: `players` lists `[index, { name?, score? }]` only for players whose name or score differ (indices inside the list), `current`, `deckSize` and `result` only when different, `turn` as the `Partial<Turn>` of differing fields (arrays compared by value; a whole `Turn` when `prev.turn` is `null`; `null` when `next.turn` is `null`); `'structural'` when the number of players differs; `null` when nothing differs; `version` is never part of a diff; `applyGameDiff` never mutates its input. Export both from `libs/game-rules/src/index.ts`
- [ ] T006 [P] [US1] Write `libs/game-rules/src/lib/game-diff.spec.ts`: one case per change type with the exact expected diff - draw (`turn.phase`, `turn.card`, `deckSize`), throw (`turn.phase`, `turn.dice`), select (`turn.free`, `turn.run`), bank (`players` with one score, `current`, reset turn fields), bust, timeout (turn reset, `current`), computer replaces a human (`players` name), game end (`result`), turn to `null`; unchanged state gives `null`; changed player count gives `'structural'`; `applyGameDiff(prev, diffGame(prev, next))` deep-equals `next`; input not mutated
- [ ] T007 [US1] Update `libs/game-rules/src/lib/view-sync.ts`: in `valueParts` replace `change.game = next.game ?? null` by: `prev.game` missing and `next.game` set -> `change.game = next.game`; `next.game` missing and `prev.game` set -> `change.game = null`; both set -> `diffGame`, `'structural'` makes `diffView` return `'snapshot'`, otherwise `change.gameDiff = diff`. In `applyChange` apply `change.game` (as before) or `applyGameDiff(view.game, change.gameDiff)` (a `gameDiff` without a game in the view is a programming error: return the view unchanged and let the caller's gap handling ask for `game:sync`). Keep `n` handling as is
- [ ] T008 [US1] Extend `libs/game-rules/src/lib/view-sync.spec.ts`: the existing round-trip cases must pass unchanged; add a replay of seeded full games (2, 4 and 8 players, using `libs/game-rules/src/lib/simulation.spec.ts` helpers) that builds a `GameView` per accepted action and checks `applyChange(prev, {n, ...diffView(prev, next)})` equals `next` for every step (SC-004), plus: lobby-to-running sends `game`, game removal sends `game: null`, a changed player count is a snapshot
- [ ] T009 [US1] Run `npx nx test backend` and `npx nx typecheck backend`: `view-sync.service.ts` already uses `diffView`, so it sends `gameDiff` without code changes; fix the expectations in `apps/backend/src/app/lobby/view-sync.service.spec.ts` and the gateway specs that assumed a whole `game` in a running-game change
- [ ] T010 [US1] Add gateway tests in `apps/backend/src/app/lobby/lobby.gateway.changes.spec.ts`: after a draw the change has `gameDiff` with `turn.card` and `deckSize` and no `players`; after a bank `gameDiff.players` names only the banking player's index; after a turn ends `gameDiff.current` is the new player; the game end carries `gameDiff.result`; the spectator receives the same `gameDiff` as a player; the view reached by applying all changes of a played game equals `snapshot()` taken at the end (SC-004)
- [ ] T011 [US1] Check the frontend consumers of the changed view: `apps/frontend/src/app/core/socket.service.ts` already calls `applyChange`; adapt `apps/frontend/src/app/core/socket.service.spec.ts` and `apps/frontend/src/app/core/testing.ts` where they build changes with a whole `game`; run `npx nx test frontend` and fix only test fixtures (no UI change expected)
- [ ] T012 [US1] Tighten the size test of T002 to "below 300 bytes" (SC-001: at least 60% smaller than 747) and run `npm run measure:socket -- --label v13-us1` to record the saving of Story 1 (keep the label's JSON in `tmp/`)

**Checkpoint**: Differences for the game part work end to end; the log is still in the old form.

---

## Phase 4: User Story 2 - A compact log (Priority: P1)

**Goal**: Wire log groups in snapshots and changes, decoded in one place (FR-005, FR-006, SC-005).

**Independent Test**: the displayed log of a full game is identical before and after, in English and German; the log part of a bust is clearly smaller.

- [ ] T013 [P] [US2] In `libs/game-rules/src/lib/protocol.ts` add `WireLogEntry`, `WireLogGroup` (`{ at: number; seat?: number; e: WireLogEntry[] }`) and `WireView = Omit<GameView, 'log'> & { log: WireLogGroup[] }`; use `WireView` in the snapshots (acks of `session:start`, `game:create`, `game:join`, `game:spectate`, `game:rejoin`, `game:sync`, `rematch:join`, push `game:snapshot`) and `WireLogGroup[]` for `GameChange.log`. Then write `libs/game-rules/src/lib/wire-log.ts` with pure `encodeLog(entries: readonly LogEntry[]): WireLogGroup[]` and `decodeLog(groups: readonly WireLogGroup[]): LogEntry[]` exactly as in `data-model.md`: consecutive entries with equal `at` form a group; the group carries `seat` only if all its entries have the same defined seat, otherwise each entry carries its own; a turn entry (`kind: 'turn'`, `data` an engine event) becomes `{ kind: <event type>, ...event fields }`, any other entry keeps `kind` and `data`; decoding reverses it, a wire kind that is an event type becomes `{ kind: 'turn', data: { type, ...fields } }`. Export a `LOG_KINDS` constant list in `protocol.ts` if needed for the check below. Export from `libs/game-rules/src/index.ts`
- [ ] T014 [P] [US2] Write `libs/game-rules/src/lib/wire-log.spec.ts`: `decodeLog(encodeLog(x))` deep-equals `x` for hand-written logs of every `LogKind` and every `Event` type, for empty logs and for entries without seat; entries with equal `at` and equal seat share a group (assert the exact encoded shape of a bust: bust, turnEnded); entries with equal `at` and different seats keep per-entry seats; a type-level or runtime test proves that `LogKind` names and `Event['type']` names do not overlap; a replay of seeded full games (as in T008) round-trips the whole room log
- [ ] T015 [US2] Update `libs/game-rules/src/lib/view-sync.ts`: `GameChange.log` is `WireLogGroup[]` on the wire while `diffView` keeps working with rich views; add `encodeChange(parts: ChangeParts): GameChange-without-n` (applies `encodeLog` to `parts.log`) and let `applyChange` take the wire change and `decodeLog` its `log` before `appendLog`; add `encodeView(view: GameView): WireView` and `decodeView(view: WireView): GameView`; export them. Extend `view-sync.spec.ts`: `applyChange(prev, {n, ...encodeChange(diffView(prev, next))})` equals `next`, `decodeView(encodeView(v))` equals `v`, trimming at `LOG_CAP` is identical for a client that joined late and one that applied every change (Story 2, scenario 3)
- [ ] T016 [US2] Update `apps/backend/src/app/lobby/view-sync.service.ts`: `snapshot()` returns `encodeView(view)` (the cache keeps the rich view), `changes()` applies `encodeChange` to the diff and `encodeView` to a structural snapshot; update `apps/backend/src/app/lobby/view-sync.service.spec.ts` (shape of payloads) and every `lobby.gateway*.spec.ts` that reads `log` from a snapshot or change (use `decodeView`/`decodeLog` from `game-rules` in the test client `apps/backend/src/app/lobby/testing/client.ts` so tests keep reading rich entries)
- [ ] T017 [US2] Update `apps/frontend/src/app/core/socket.service.ts`: add one private `adopt(view: WireView)` that runs `decodeView` and sets the `game` signal; replace every `this.game.set(ack.game)` / `this.game.set(p.game)` / `this.game.set(ack.game ?? null)` of an ack or `game:snapshot` (create, join, spectate, rejoin, `rematch:join`, `game:sync`, `session:start`) by `adopt(...)`; `change()` keeps calling `applyChange` with the wire change; update `socket.service.spec.ts` fixtures to wire form
- [ ] T018 [P] [US2] Add a log display test in `apps/frontend/src/app/core/game-view.spec.ts` (or the spec next to `logText`): the text lines for a decoded log of every `LogKind` and event type are identical in English and German to the lines produced from the same rich log (SC-005); `table.ts` needs no change - if `npx nx test frontend` shows one, record why in the PR
- [ ] T019 [US2] Add gateway tests: a snapshot (ack of join, spectate, rejoin, `game:sync`) carries `log` groups and `decodeView` gives the same entries as the room log; a bust change has one group with `bust` and `turnEnded`; after more than `LOG_CAP` entries two clients (one joined at the start, one late) hold the same decoded log
- [ ] T020 [US2] Run `npm run measure:socket -- --label v13-us2` and record the saving of Story 2

**Checkpoint**: Game part and log are compact; log text unchanged; all tests green.

---

## Phase 5: User Story 3 - No redundant values in a change (Priority: P2)

**Goal**: Partial `you`, deadline rule D, no empty messages (FR-007, FR-008).

**Independent Test**: a turn change with timers has no `turnDeadline: null` next to `gameDiff.current`; a timeout warning change contains only `you.timeoutWarning`.

- [ ] T021 [US3] Change `GameChange.you` in `libs/game-rules/src/lib/protocol.ts` to `Partial<Omit<GameView['you'], 'reserved'>> & { reserved?: number | null }`. Update `libs/game-rules/src/lib/view-sync.ts`: `valueParts` sends `you` as the partial of the keys that differ (`reserved` removed -> `null`); `applyChange` merges `{ ...view.you, ...change.you }` and deletes `reserved` when it is `null`; implement rule D: `applyChange` removes `turnDeadline` when `change.gameDiff` has `current`, a `turn.phase`, or a `result`, when `change.game === null`, or when `change.paused === true`, unless `change.turnDeadline` is set; `diffView` omits `turnDeadline: null` exactly when that rule already yields it for this change, otherwise it still sends `null`
- [ ] T022 [US3] Extend `libs/game-rules/src/lib/view-sync.spec.ts`: warning on/off sends only that key; own seat change sends `you: { seat }`; `reserved` set and removed; spectator flip is still a snapshot; rule D cases (bank/bust/timeout move the turn, pause, game end, deadline kept when `turnDeadline` is in the same change, `null` still sent when only the timer is switched off); the seeded-game replay of T008 still round-trips with both rules active
- [ ] T023 [US3] Add gateway tests in `apps/backend/src/app/lobby/lobby.gateway.changes.spec.ts`: a timeout warning change equals `{ n, you: { timeoutWarning: true }, log: [...] }` plus the turn part only if the turn moved; a turn change to a human has one `turnDeadline` and no clearing before it; a change that does not concern a recipient (for example a spectator count seen by a player who already has it) is not sent and does not raise `n`; a game with only computers sends no `turnDeadline` and no warning
- [ ] T024 [US3] Check the frontend uses of `you` and `turnDeadline` (`apps/frontend/src/app/table/table.ts`, `apps/frontend/src/app/core/table-view.ts`): they read the merged view, so no change is expected; run `npx nx test frontend` and fix fixtures only
- [ ] T025 [US3] Run `npm run measure:socket -- --label v13-us3` and record the saving of Story 3

**Checkpoint**: Stories 1 to 3 complete; the figures after them decide Story 4.

---

## Phase 6: User Story 5 - Measure again and record the decision (Priority: P1)

**Goal**: Figures, saving per story and decisions are documented (FR-013, FR-015, SC-001 to SC-003, SC-007).

**Independent Test**: `npm run measure:socket -- --label v13` prints the same four scenarios; `docs/socket-traffic.md` shows v11, v12 and v13 and the decisions.

- [ ] T026 [US5] Add the key-table estimate to `apps/backend/src/app/lobby/measure/socket-traffic.measure.ts`: after a run, re-serialise every received frame body with a throw-away table of the object keys that occur (`playerId` -> `pid`, `seats` -> `s`, `players` -> `p`, `score` -> `sc`, `timeoutWarning` -> `tw`, `gameDiff` -> `gd`, and so on, generated by listing the distinct keys of the recorded frames and shortening them uniquely) and print the bytes per player and per spectator with and without it; no production code reads this table
- [ ] T027 [US5] Run `npm run measure:socket -- --label v13` and compare with `v12`: check SC-001 (card draw at most 300 bytes in the 4-player test), SC-002 (8-player bytes per player at most 0.185 MB, reached without short keys) and SC-003 (the same for spectators). If a target is missed, add a finding to the PR and fix the cause before continuing (candidates in `research.md` R4)
- [ ] T028 [US5] Update `docs/socket-traffic.md`: add "Result (protocol 13, spec 018)" with the tables per person and per spectator (v11, v12, v13 and the saving), the size series of one change, the saving per story from `v13-us1` to `v13-us3`, the success criteria with the numbers, and the decisions table: CSV-formatted strings rejected (escaping of names, lost types, little gain for the frequent messages), compression postponed, binary encoding dropped, the host receives its own change (no optimistic client state), the Engine.IO heartbeat unchanged, short keys per T029; update the "What is left" and the "Finer or generic diffs" row of spec 017 to point to this result

**Checkpoint**: Figures recorded; the gate for Story 4 can be evaluated.

---

## Phase 7: User Story 4 - Shorter message keys (Priority: P3, gated)

**Goal**: Only if the estimate of T026 shows at least 25% less data per player in the 8-player game compared with `v13` (FR-012).

**Independent Test**: both sides use one table; a field without an entry fails the tests.

- [ ] T029 [US4] Decide from the T026 estimate and write the decision into `docs/socket-traffic.md` and `research.md` R9: if the saving is below 25%, Story 4 is dropped - tick T030 to T033 as "not built" with the number in the PR description and stop here; otherwise continue with T030
- [ ] T030 [US4] (only if T029 says build) Add `libs/game-rules/src/lib/wire-keys.ts` with the one table (full key -> short key) and pure `shortenKeys(value)` / `expandKeys(value)` for the message payloads, with a runtime check that no two keys of one object map to the same short key; export from `libs/game-rules/src/index.ts`
- [ ] T031 [US4] (only if built) Write `libs/game-rules/src/lib/wire-keys.spec.ts`: round trip for every message shape (`GameChange`, `WireView`, `GameSummary`); a test that walks the TypeScript types' sample objects and fails when a key has no table entry (FR-012, scenario 2); no duplicate short keys
- [ ] T032 [US4] (only if built) Apply the table at the send boundary: `apps/backend/src/app/lobby/view-sync.service.ts` and `apps/backend/src/app/lobby/lobby.gateway.ts` for pushes and acks, `apps/frontend/src/app/core/socket.service.ts` for receiving; the test client in `testing/client.ts` expands keys; run all gateway and frontend tests
- [ ] T033 [US4] (only if built) Run `npm run measure:socket -- --label v13-keys`, add the figures to `docs/socket-traffic.md` and note the lower readability in the browser tools

**Checkpoint**: Story 4 built and measured, or dropped with the number recorded.

---

## Phase 8: Polish and cross-cutting

- [ ] T034 [P] Add a gateway test for the old client (clarification of 2026-10-20): `session:start` with `protocolVersion: 12` is answered `versionMismatch` and the socket receives no `game:change`/`game:snapshot` afterwards, in `apps/backend/src/app/lobby/lobby.gateway.spec.ts`
- [ ] T035 [P] Verify the frontend side of T034 in `apps/frontend/src/app/core/socket.service.ts` and its spec: after a `versionMismatch` ack no table is left (`game` is `null`) and `error.versionMismatch` is shown (English and German texts exist); fix only if the check fails and record what was found in the PR
- [ ] T036 Update `docs/roadmap.md`: move R25 to the Done table as spec 018 with a one-line result (the figures of T028 and the Story 4 decision), set "Last updated"; update `README` or `docs` mentions of `PROTOCOL_VERSION` 12 if any (`grep -rn "protocol 12\|version 12"`)
- [ ] T037 Run `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` and fix findings; run `npm run test:e2e` once manually (skill `run-e2e`) to cover the player, spectator and rematch flows against real sockets (SC-006)
- [ ] T038 Run `/speckit-sonar-local` and fix findings; update `.specify/memory/test-coverage-guide.md` and `sonar.coverage.exclusions` only if a new file is a pure bootstrap or measurement file (the new files in `libs/game-rules` are logic and stay covered)

---

## Dependencies and execution order

- Phase 1 first (v12 figures); Phase 2 next. T013 to T017 change the wire type of the log and the code that reads it in one go, so keep them in one working session and commit them together (the repository compiles again after T017).
- US1 (Phase 3) before US2 (Phase 4) because both edit `view-sync.ts` and the service; US3 (Phase 5) after US2.
- US5 (Phase 6) after US3; US4 (Phase 7) only after T028 and its gate T029.
- Polish after the measurement; T034 and T035 can run in parallel with Phase 6.

### Parallel opportunities

- T005 and T006 (different files, same story); T013 and T014; T018 next to T016/T017 once T015 is done; T034 and T035.

## Implementation strategy

- **MVP**: Phase 1 to Phase 3 (US1). It delivers the largest saving (the `game` part is about 650 of 747 bytes in a draw) and can be measured alone (T012).
- Then US2 (log), US3 (redundant values), measure (US5). Story 4 stays optional and is decided by a number.
- Commit per phase checkpoint with conventional messages (`feat(game-rules): ...`, `feat(backend): ...`, `docs(socket): ...`).
