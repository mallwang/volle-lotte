---
description: 'Task list for spectators'
---

# Tasks: Spectators

**Input**: Design documents from `/specs/016-spectators/`

**Prerequisites**: plan.md, spec.md, design.md, research.md, data-model.md, contracts/protocol.md

**Tests**: Test work is included: the constitution requires tests for new logic in the same change. Backend and `libs/game-rules` use Jest, the frontend uses the helpers in `apps/frontend/src/app/core/testing.ts`.

**Organization**: Tasks are grouped by user story. US1 is the MVP (watch a running game, read-only); US2 adds the counter; US3 the host switch; US4 the guarantee that spectators never disturb timers and game end, plus the spectator game-over view; US5 the reload. This feature changes the protocol (`PROTOCOL_VERSION` 10 to 11).

## Phase 1: Foundational

**Purpose**: Protocol, session and room state, the spectator view, the join/leave intents and the client plumbing. All stories use them.

**⚠️ CRITICAL**: Complete this phase before the user stories.

- [x] T001 Update `libs/game-rules/src/lib/protocol.ts` per `contracts/protocol.md`: `PROTOCOL_VERSION = 11`; `ErrorReason` gains `'notSpectatable'`; `GameView.you` gains `spectator?: boolean`; `GameView` gains `spectating: boolean` and `spectators: number`; `GameSummary` gains `spectatable: boolean`; `GameSettings` gains `spectating?: boolean`; `Intents` gains `'game:spectate': [{ gameId: string; password: string }, { game: GameView }]`; `Pushes['game:closed'].reason` gains `'spectatingOff'`; update `libs/game-rules/dist` only through the normal build, never by hand
- [x] T002 [P] Update `apps/backend/src/app/lobby/sessions.service.ts`: `Session` gains `spectating?: string` (room id, exclusive with `gameId`, kept across a disconnect); add a test case in `sessions.service.spec.ts` that it survives `detach` and is cleared by an explicit reset
- [x] T003 Update `apps/backend/src/app/lobby/game-room.ts` per `data-model.md`: field `spectating = true`; `readonly spectators = new Set<string>()`; `addSpectator(playerId): Res` (`notSpectatable` unless `phase === 'running'` and `spectating`; `alreadyInGame` if the player has a seat, a reservation or is in `dropped`; idempotent for an existing spectator) and `removeSpectator(playerId): boolean`; both call `onChange?.([])` only when the set changed, so no log entry and no `game:log` is produced; `summary()` returns `spectatable: phase === 'running' && spectating`; `humans()`, `hasConnectedHuman()`, `seatOf` and every timer path stay untouched; `dispose()` clears `spectators`
- [x] T004 [P] Update `apps/backend/src/app/lobby/view.ts`: `toView` adds `spectating` and `spectators: room.spectators.size` for everyone; for a playerId in `room.spectators`, `you` is `{ playerId, seat: -1, timeoutWarning: false, spectator: true }`; `waitingView` also carries `spectating` and `spectators`; the deck, hashes and tokens stay out
- [x] T005 Update `apps/backend/src/app/lobby/lobby.gateway.ts`: extract the password and rate-limit check of `join` into a private `checkPassword(client, room, password): Ack | undefined` and use it in `join` and the new handler; add `@SubscribeMessage('game:spectate')` (`noSession`, `alreadyInGame` when `roomOf(session)` or `session.spectating` is set, `invalidRequest` for a non-string `gameId`, `gameNotFound`, `banned` when `room.banned.has(playerId)`, password check, `room.addSpectator`, then `session.spectating = room.id`, `client.leave(LOBBY)`, `pushLobby()`, ack with `toView`); `game:leave` handles a spectator (`removeSpectator`, clear `session.spectating`, back to the lobby like `exit`); `handleDisconnect` removes the spectator from the set but keeps `session.spectating`; `push()` also sends `game:state` (never `game:log`) to `room.spectators`; `closed()` sends spectators `game:closed` with reason `cleanup` (room removed) or `ended` and resets their sessions; the `Intents` typing keeps `satisfies` checks green
- [x] T006 [P] Add backend tests in `apps/backend/src/app/lobby/game-room.spec.ts`, `view.spec.ts` and `lobby.gateway.spec.ts`: `addSpectator` rules (lobby phase, spectating off, finished, seated player, idempotent), no log entry and no `game:log` on join and leave, `summary().spectatable`, spectator view fields (`you.spectator`, `seat -1`, no deck), `game:spectate` errors (`noSession`, `gameNotFound`, `alreadyInGame`, `banned`, `notSpectatable`, wrong and missing password with the shared rate limit), a spectator answers `notInGame` to `turn:action`, `turn:preview`, `seat:ready`, `game:start`, `game:pause`, `game:settings`, `rematch:start`
- [x] T007 [P] Update `apps/frontend/src/app/core/game-view.ts` with `isSpectator(g: GameView): boolean` (`g.you.spectator === true`) and keep `isHost` false for a spectator; add `game-view.spec.ts` cases
- [x] T008 Update `apps/frontend/src/app/core/socket.service.ts`: `spectate(payload: Intents['game:spectate'][0])` mirroring `join` (sets `game` on success); `game:closed` with reason `spectatingOff` shows the info text `server.spectatingOff`; extend `socket.service.spec.ts` for both
- [x] T009 Fix the seat semantics in `apps/frontend/src/app/table/table.ts`: `removed` (`you.seat < 0`) must be `false` for a spectator, so a spectator never sees the "a computer took over" state; add a case in `table.spec.ts`

**Checkpoint**: A visitor can spectate through the socket; all play intents are refused; the protocol is versioned.

---

## Phase 2: User Story 1 - Watch a running game (Priority: P1) 🎯 MVP

**Goal**: "Watch" in the games list opens a read-only table; leave works.

**Independent Test**: With a running game of two players, a third visitor sees "Watch", joins (with the password for a protected game), sees scores, the active player's dice and the log, no play buttons, only "Skip dice animation" in the settings, and leaves back to the lobby. With all 8 seats full, watching still works.

- [x] T010 [US1] Update `apps/frontend/src/app/lobby/lobby.ts`: show a secondary "Watch" button on a card when `g.spectatable` and the viewer is not already `rejoinable`/`closable` (per `design.md`); no button when spectating is off or the game is in its lobby phase; protected games open the existing password dialog in a "watch" mode (title `lobby.watchTitle`, submit calls `socket.spectate`); errors go through the existing error mapping, `notSpectatable` gets its own text
- [x] T011 [US1] Update `apps/frontend/src/app/table/table.ts` (and its template) for a spectator: banner "You are watching…" and a `Watching` tag next to the title; hide Throw/Bank/select controls, keep the dice area and the active player's turn total; the players list, log and "Leave game" stay; leaving a spectator needs no confirmation and goes through `socket.leave`; keep keyboard focus order sensible
- [x] T012 [US1] Update `apps/frontend/src/app/table/settings-dialog.ts` and `apps/frontend/src/app/shared/host-settings.ts`: for a spectator show only "Skip dice animation" (no host controls, not even read-only); non-host players keep today's read-only host settings
- [x] T013 [P] [US1] Add English and German texts in `apps/frontend/src/app/i18n/en.ts` and `de.ts`: `lobby.watch`, `lobby.watchTitle`, `error.notSpectatable`, `table.watching`, `table.watchingBanner`, `server.spectatingOff` (German without gender-inclusive forms, see CLAUDE.md); `i18n.spec.ts` must stay green
- [x] T014 [P] [US1] Add frontend tests: `lobby.spec.ts` (Watch visible only for a spectatable game, password dialog for a protected game, success enters the game), `table.spec.ts` (no play controls and a banner for a spectator, leave without confirmation, still shows scores and log), `settings-dialog.spec.ts` (only the skip toggle for a spectator)
- [x] T015 [US1] Add a gateway test in `lobby.gateway.spec.ts` for the full flow: second player plays a turn, the spectator's socket receives the matching `game:state`, leaving returns the session to the lobby; a ninth viewer can spectate an 8-player game (FR-002)

**Checkpoint**: US1 works alone: a read-only table for any visitor.

---

## Phase 3: User Story 2 - Counter without disturbance (Priority: P1)

**Goal**: Everybody sees the number of spectators; joining and leaving change only that number.

**Independent Test**: Join and leave several times as spectator; the counter changes for players and spectators, the players get no log entry, toast or other message; players and computers are never counted.

- [x] T016 [US2] Show the counter in the title row of `apps/frontend/src/app/table/table.ts` per `design.md`: a chip with the eye icon (PrimeIcons) and the text from `table.spectators` / `table.watchingCount` (singular and plural), `role="status"` with an accessible label, muted at 0, hidden when `game.spectating` is false; spectators and players see the same value
- [x] T017 [P] [US2] Add English and German texts: `table.spectators` (`{count}` with singular and plural), `table.spectatorsLabel`
- [x] T018 [P] [US2] Add tests: `table.spec.ts` (chip text for 0, 1 and 3; hidden when spectating is off), `socket.service.spec.ts` (a `game:state` that only changes the count raises no toast and no log entry on the client), and a check that a `game:state` push with an unchanged game does not restart the dice animation (guards the research.md assumption), in `dice-area.spec.ts` or `table.spec.ts`
- [x] T019 [US2] Add a gateway test: with two players and one spectator, spectator join and leave each produce exactly one `game:state` per participant, no `game:log`, and the count is `1` then `0`; computers and players never raise it

**Checkpoint**: US2 works: the counter is accurate and silent.

---

## Phase 4: User Story 3 - Host switches spectating off (Priority: P2)

**Goal**: The host switch removes all spectators and hides "Watch".

**Independent Test**: As host, turn "Allow spectators" off while a spectator watches: the spectator is back in the lobby with a message, the game shows no Watch button and no counter, players see the settings toast. Turn it on: Watch returns, the counter starts at 0.

- [x] T020 [US3] Update `apps/backend/src/app/lobby/game-room.ts` `setSettings` and `lobby.gateway.ts` `settings`: accept `spectating` (boolean) alone or with other fields as a valid patch (host only, lobby or running phase); on `false`, clear `spectators` and have the gateway send each affected session `game:closed` with `spectatingOff` (reset `session.spectating`, join `LOBBY`, `pushLobby()`); the change appears in `changes` so players get `game:settingsChanged`; spectators get no `game:settingsChanged`
- [x] T021 [US3] Add the switch "Allow spectators" in `apps/frontend/src/app/shared/host-settings.ts` (toggle `inputId="allow-spectators"`, hint `settings.spectatingHint`, disabled with `settings.hostOnly` for non-hosts, never shown to spectators); `settingText` in `socket.service.ts` handles `spectating` (`toast.setting.spectating.on` / `.off`)
- [x] T022 [P] [US3] Add English and German texts: `settings.spectating`, `settings.spectatingHint`, `toast.setting.spectating.on`, `toast.setting.spectating.off`, `server.spectatingOff` wording check
- [x] T023 [P] [US3] Add tests: `game-room.spec.ts` (switch off clears spectators and blocks `addSpectator`, on re-enables, count starts at 0), `lobby.gateway.spec.ts` (non-host `notHost`, spectator receives `spectatingOff` and lands in the lobby, players get `game:settingsChanged`), `host-settings.spec.ts` (switch visible and enabled for the host, read-only for others, hidden for a spectator), `lobby.spec.ts` (no Watch when `spectatable` is false)

**Checkpoint**: US3 works: one switch controls spectating.

---

## Phase 5: User Story 4 - Spectators never disturb the game (Priority: P2)

**Goal**: Timers, inactivity, cleanup and game end behave exactly as without spectators; spectators see the game-over view.

**Independent Test**: Run a game in which only spectators stay connected: the cleanup timer runs and removes the room as without spectators. At game end the spectator sees the game-over modal with only "Back to the lobby".

- [x] T024 [US4] Add the spectator variant in `apps/frontend/src/app/table/game-over.ts`: ranking and outcome as for others, only the "Back to the lobby" button (no Rematch, no Rejoin, no waiting text), hint "Thanks for watching! We hope you had fun and look forward to seeing you next time."; the finished table stays visible behind it
- [x] T025 [US4] In `apps/backend/src/app/lobby/game-room.ts` `rematch()`: when a rematch reopens the room as a lobby, clear `spectators` and have the gateway send each spectator `game:closed` with reason `ended` (back to the lobby, not carried into the rematch lobby, FR-015); verify `GameRegistryService.arm`/`closeIfEmpty` still only look at humans (covered by the test in T027, no code change expected)
- [x] T026 [P] [US4] Add English and German texts: `gameOver.spectatorHint`
- [x] T027 [P] [US4] Add tests: `game-registry.service.spec.ts` (a room with spectators but no connected human arms the cleanup timer and is removed at its end, spectators receive `game:closed`), `game-room.spec.ts` (a turn timeout, computer takeover and game end run unchanged with a spectator present; the spectator never counts for `hasConnectedHuman`), `lobby.gateway.spec.ts` (rematch start sends `game:closed` `ended` to spectators), `game-over.spec.ts` or `table-game-over.spec.ts` (spectator sees only "Back to the lobby")

**Checkpoint**: US4 works: spectators are invisible to game logic.

---

## Phase 6: User Story 5 - Reload as spectator (Priority: P3)

**Goal**: A reload returns the spectator to the same game.

**Independent Test**: Reload the spectator tab: same game, counter still 1. If spectating was switched off or the game ended meanwhile, the spectator lands in the lobby.

- [x] T028 [US5] Update `session:start` in `apps/backend/src/app/lobby/lobby.gateway.ts`: if `session.spectating` names a room that still exists and `addSpectator` succeeds (running or finished, spectating on), leave `LOBBY`, return the spectator `game` view in the ack; otherwise clear `session.spectating` and continue in the lobby; the frontend already uses `ack.game` from `session:start`, add a case in `socket.service.spec.ts`
- [x] T029 [P] [US5] Add gateway tests: reload returns the view and the count stays 1; a finished game still resumes a spectator (until they leave); a switched-off or removed room does not; a session cannot hold a seat and spectate at once
- [x] T030 [P] [US5] Make sure `addSpectator` accepts a `finished` room for a returning spectator but not a new one (separate `resume` flag), with a room test

**Checkpoint**: US5 works: the spectator survives a reload.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, quality gates and one real-browser check.

- [x] T031 [P] Update `docs/user-guide.md` and `docs/user-guide.de.md`: watching a running game, the counter, the host switch "Allow spectators", what spectators can and cannot do; update `README.md` and `README.de.md` feature lists if they list features
- [x] T032 [P] Update `docs/roadmap.md`: set R8 to `done` with the decisions (anonymous, on/off switch, password rule, running games only) and add a row for spec 016 in the done table in the format of the 015 row; note the protocol version 11
- [x] T033 Extend `apps/backend/src/app/lobby/lobby.gateway.e2e.spec.ts` with one spectator flow (spectate, receive state, leave) and run `npm run test:e2e` once
- [x] T034 Run `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build` and fix findings; confirm per-project coverage stays at or above 80% and no new skip-list entry is needed
- [x] T035 Verify the UI once with the `verify-ui` skill (Playwright): the scenarios of `quickstart.md` on desktop and phone width, light and dark; fix visible problems
- [x] T036 Review the German texts in `apps/frontend/src/app/i18n/de.ts` and `docs/*.de.md` for gender-inclusive forms (CLAUDE.md) and the new English texts for consistency with the mockup wording

---

## Dependencies & Execution Order

- **Phase 1** blocks everything. Inside it: T001 first; T002 and T007 in parallel; T003 needs T001 and T002; T004 and T005 need T003; T006 after T005; T008 needs T001; T009 needs T007.
- **US1** (T010 to T015) needs Phase 1; T010, T011 and T012 touch different files; T013 before the frontend tests.
- **US2** (T016 to T019) needs US1 (the table) and Phase 1; the count itself already exists from T003 and T004.
- **US3** (T020 to T023) needs Phase 1; T021 needs T020 for the toast text path; the lobby message needs T008.
- **US4** (T024 to T027) needs US1; T025 needs T020 (the shared `game:closed` path).
- **US5** (T028 to T030) needs T005 and T003.
- **Polish** (T031 to T036) after the stories; T034 and T035 last.

## Parallel Opportunities

- Phase 1: T002 and T007 together; T004 and T005 after T003; T006 after T005.
- US1: T013 in parallel with T010 to T012; T014 and T015 after them.
- US3: T022 and T023 in parallel after T020 and T021.
- Polish: T031 and T032 in parallel.

## Implementation Strategy

1. Phase 1, then US1 as the MVP: a read-only table that can be validated alone with scenario 1 of `quickstart.md`.
2. US2 (counter), then US3 (host switch) and US4 (no disturbance), each independently testable.
3. US5 (reload), then polish: documentation, quality gates, one browser check.
