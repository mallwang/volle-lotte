---
description: 'Task list for computer player names'
---

# Tasks: Computer Player Names

**Input**: Design documents from `/specs/012-computer-player-names/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test work is included because the specification requires measurable test outcomes and the constitution requires tests for new logic.

**Organization**: Tasks are grouped by user story to enable incremental implementation and verification.

## Phase 1: Setup

**Purpose**: Create the shared library structure required by the feature.

- [ ] T001 Create the `computer-names` Nx workspace library with `scope:shared` and package entry points in `libs/computer-names/project.json`, `libs/computer-names/package.json`, `libs/computer-names/tsconfig.lib.json`, and `libs/computer-names/src/index.ts`

---

## Phase 2: Foundational

**Purpose**: Establish shared language and name-generation primitives required by the user stories.

**⚠️ CRITICAL**: Complete this phase before starting user-story work.

- [ ] T002 [P] Add typed English and German word entries and pure adjective+noun selection with injectable random indices in `libs/computer-names/src/lib/english.ts`, `libs/computer-names/src/lib/german.ts`, and `libs/computer-names/src/lib/generate-name.ts`; German noun entries MUST carry grammatical gender and adjectives MUST provide matching masculine, feminine, and neuter forms
- [ ] T003 [P] Add generator unit tests in `libs/computer-names/src/lib/generate-name.spec.ts` covering English and German word membership, gender agreement, deterministic injected randomness, and exhaustive combination traversal
- [ ] T004 Add the supported `'en' | 'de'` language type, language-bearing `session:start` and language-update intent, computer-seat `name` field, and incremented `PROTOCOL_VERSION` in `libs/game-rules/src/lib/protocol.ts`
- [ ] T005 Add protocol type/contract tests for accepted language values, named computer seat views, and protocol version behavior in `libs/game-rules/src/lib/protocol.spec.ts`
- [ ] T006 Retain validated UI language on session creation/resume and synchronize language updates to a player's active human seat in `apps/backend/src/app/lobby/sessions.service.ts`, `apps/backend/src/app/lobby/lobby.gateway.ts`, and `apps/backend/src/app/lobby/game-room.ts`; unknown or missing language MUST use English
- [ ] T007 Send the active UI language on initial session start, token resume, and language changes in `apps/frontend/src/app/core/socket.service.ts` and `apps/frontend/src/app/core/i18n.service.ts`
- [ ] T008 Add backend tests for session language validation, resume retention, live updates, and synchronization to an active room seat in `apps/backend/src/app/lobby/sessions.service.spec.ts` and `apps/backend/src/app/lobby/lobby.gateway.spec.ts`
- [ ] T009 Add frontend socket tests verifying initial start, reconnect/resume, and live language changes in `apps/frontend/src/app/core/socket.service.spec.ts`

**Checkpoint**: The shared generator and language-aware session/protocol foundation are ready; no user-story tasks should begin until this phase is complete.

---

## Phase 3: User Story 1 - Computers get readable, random names in the lobby (Priority: P1) 🎯 MVP

**Goal**: Every computer seat receives a unique, localized name in the lobby, and that identity carries into the active game and all player views.

**Independent Test**: Create a lobby in each UI language, assign multiple computer seats, and verify that every name is a distinct two-word name in the host's language and remains the same for all clients and in the started game.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add `GameRoom` tests for generated computer names, case-insensitive uniqueness against occupied human/computer names, and fresh names after reopening a seat in `apps/backend/src/app/lobby/game-room.spec.ts`
- [ ] T011 [P] [US1] Add game-state tests verifying that names passed to game creation are retained through turns and final results in `libs/game-rules/src/lib/game.spec.ts`
- [ ] T012 [P] [US1] Add frontend lobby/table view tests verifying the authoritative named computer seat is displayed instead of a synthesized `Computer N` label in `apps/frontend/src/app/game-lobby/game-lobby.spec.ts` and `apps/frontend/src/app/table/table.spec.ts`

### Implementation for User Story 1

- [ ] T013 [US1] Add a server-side injected random-index source backed by `crypto.randomInt` and a unique-name picker that retries collisions against occupied names and adds a distinguishing suffix only if combinations are exhausted in `apps/backend/src/app/lobby/game-room.ts`
- [ ] T014 [US1] Add a required name to computer seat state and assign a generated name when the host changes an open/locked lobby seat to computer in `apps/backend/src/app/lobby/game-room.ts`
- [ ] T015 [US1] Include the computer name in every lobby and running-game seat view in `apps/backend/src/app/lobby/view.ts` and `apps/backend/src/app/lobby/game-room.ts`
- [ ] T016 [US1] Use the room seat's computer name when constructing engine players at game start, removing the `Computer ${i + 1}` fallback in `apps/backend/src/app/lobby/game-room.ts`
- [ ] T017 [P] [US1] Render computer seat names in the lobby, active table, player log labels, and result views; remove client-side `Computer N` substitutions in `apps/frontend/src/app/game-lobby/game-lobby.ts`, `apps/frontend/src/app/table/player-seat.ts`, `apps/frontend/src/app/table/game-log.ts`, `apps/frontend/src/app/table/table.ts`, and `apps/frontend/src/app/core/game-view.ts`
- [ ] T018 [US1] Verify generated-name collisions, multiple computer seats, reconnect snapshots and name consistency between room seats and engine players with focused tests in `apps/backend/src/app/lobby/game-room.spec.ts` and `apps/backend/src/app/lobby/lobby.gateway.e2e.spec.ts`

**Checkpoint**: Lobby-created computer players have unique localized names visible consistently through a full game.

---

## Phase 4: User Story 2 - Host renames a computer (Priority: P1)

**Goal**: The host can rename a computer in the lobby or active game; invalid, duplicate, or unauthorized changes do not alter authoritative state.

**Independent Test**: Rename a computer as host in the lobby and during a running game, verify all clients and future result views use the new name, and verify invalid and non-host requests leave it unchanged.

### Tests for User Story 2

- [ ] T019 [P] [US2] Add game-state tests for immutable player-name replacement that preserves score, turn, deck, ranking and other player data in `libs/game-rules/src/lib/game.spec.ts`
- [ ] T020 [P] [US2] Add `GameRoom` tests for host-only rename, computer-seat-only targets, existing nickname validation, case-insensitive uniqueness, lobby/running phase behavior, and state/log update in `apps/backend/src/app/lobby/game-room.spec.ts`
- [ ] T021 [P] [US2] Add gateway socket tests for rename acknowledgement, rejection, and broadcast to all clients in `apps/backend/src/app/lobby/lobby.gateway.e2e.spec.ts`
- [ ] T022 [P] [US2] Add frontend tests for host-only rename affordances and error/success handling in `apps/frontend/src/app/game-lobby/game-lobby.spec.ts` and `apps/frontend/src/app/table/table.spec.ts`

### Implementation for User Story 2

- [ ] T023 [US2] Add a validated host rename intent carrying the target seat and proposed name to `libs/game-rules/src/lib/protocol.ts`
- [ ] T024 [US2] Add an immutable game-rules operation that replaces one engine player's display name without changing scores, turn state, deck or result ranking in `libs/game-rules/src/lib/game.ts` and export it from `libs/game-rules/src/index.ts`
- [ ] T025 [US2] Implement room-level rename authorization and validation: only the current host may rename an occupied computer in a lobby or running game; use the same trimmed non-empty, max-length, and allowed-character rules as player nicknames; reject case-insensitive duplicates among all occupied seats without mutation in `apps/backend/src/app/lobby/game-room.ts`
- [ ] T026 [US2] Update the corresponding engine player via the seat-to-engine mapping, publish the updated room/game view, and append a rename log event without rewriting earlier entries in `apps/backend/src/app/lobby/game-room.ts`
- [ ] T027 [US2] Handle the rename intent through the existing acknowledgement/error conventions and broadcast authoritative state in `apps/backend/src/app/lobby/lobby.gateway.ts`
- [ ] T028 [US2] Add a keyboard- and touch-operable host rename control for computer seats in the lobby and running-game settings in `apps/frontend/src/app/game-lobby/game-lobby.ts`, `apps/frontend/src/app/table/settings-dialog.ts`, and `apps/frontend/src/app/table/table.ts`
- [ ] T029 [US2] Ensure renamed values feed active table and completed result displays while existing historical log entries remain unchanged in `apps/frontend/src/app/core/game-view.ts`, `apps/frontend/src/app/table/table.ts`, and `apps/frontend/src/app/table/game-log.ts`

**Checkpoint**: Host rename works in lobby and active play; non-host, invalid, duplicate, wrong-target and finished-game requests are rejected without partial updates.

---

## Phase 5: User Story 3 - A computer that takes over gets a name in the right language (Priority: P1)

**Goal**: A takeover computer receives a unique localized name based on the host language at the relevant departure moment, including host departure and delayed disconnect replacement.

**Independent Test**: Verify a non-host departure uses the current host's language; a departing German host's takeover uses German despite an English successor; and a later English host departure uses English. Rejoin must restore the human nickname and preserve score.

### Tests for User Story 3

- [ ] T030 [P] [US3] Add `GameRoom` tests for manual leave and disconnect-grace host takeovers, checking the departing host language is used before/after host election as appropriate in `apps/backend/src/app/lobby/game-room.spec.ts`
- [ ] T031 [P] [US3] Add room and gateway tests for simultaneous takeovers producing unique names and former-player rejoin restoring nickname while retaining score and engine-seat mapping in `apps/backend/src/app/lobby/game-room.spec.ts` and `apps/backend/src/app/lobby/lobby.gateway.e2e.spec.ts`
- [ ] T032 [P] [US3] Add a frontend reconnect/language test verifying existing computer names remain stable when the host changes language and later takeovers use the updated language in `apps/frontend/src/app/core/socket.service.spec.ts`

### Implementation for User Story 3

- [ ] T033 [US3] Generate a unique localized computer name during running-game player replacement, preserving former-player rejoin metadata and engine seat/score continuity in `apps/backend/src/app/lobby/game-room.ts`
- [ ] T034 [US3] Resolve takeover language from the current host for a non-host departure and capture the departing host's retained locale before deliberate leave or disconnect grace host election can change the host in `apps/backend/src/app/lobby/game-room.ts` and `apps/backend/src/app/lobby/lobby.gateway.ts`
- [ ] T035 [US3] Preserve generated computer identity through reconnect snapshots and host changes; restore the former human nickname and release the computer name when that player reclaims the seat in `apps/backend/src/app/lobby/game-room.ts` and `apps/backend/src/app/lobby/view.ts`
- [ ] T036 [US3] Verify repeated alternating German/English host departures, abrupt disconnect grace expiry, uniqueness, rejoin, and unchanged scoring/timers in `apps/backend/src/app/lobby/game-room.spec.ts` and `apps/backend/src/app/lobby/lobby.gateway.e2e.spec.ts`

**Checkpoint**: All manual leave, timeout and delayed-disconnect takeovers use the correct host language, and rejoin behavior remains intact.

---

## Phase 6: User Story 4 - Texts and documentation in both languages (Priority: P3)

**Goal**: All new controls and feedback are translated, and user guides explain generated names, host renaming and the language rule.

**Independent Test**: Switch between English and German, operate rename and trigger validation errors in each language, then verify both user guides describe the feature consistently.

### Tests for User Story 4

- [ ] T037 [P] [US4] Add translation coverage tests for every new computer-name, rename, validation, and error string in `apps/frontend/src/app/i18n/i18n.spec.ts`

### Implementation for User Story 4

- [ ] T038 [P] [US4] Add English UI strings for computer naming and rename controls/errors in `apps/frontend/src/app/i18n/en.ts`
- [ ] T039 [P] [US4] Add German UI strings for computer naming and rename controls/errors in `apps/frontend/src/app/i18n/de.ts`
- [ ] T040 [P] [US4] Document computer names, host rename behavior, and generated-name language selection in `docs/user-guide.md`
- [ ] T041 [P] [US4] Add the corresponding German explanation in `docs/user-guide.de.md`

**Checkpoint**: The full feature is understandable and usable in both supported UI languages.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature, workspace boundaries, responsive behavior, and regression guarantees.

- [ ] T042 [P] Verify long and umlaut-containing computer names remain legible in seat columns and the full value is available to keyboard and pointer users in `apps/frontend/src/app/table/player-seat.ts`, `apps/frontend/src/app/table/player-seat.spec.ts`, and `apps/frontend/src/app/game-lobby/game-lobby.ts`
- [ ] T043 Run all validation scenarios from `specs/012-computer-player-names/quickstart.md` and record any required fixes in the affected tests and implementation files
- [ ] T044 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` from the repository root and resolve feature-related failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; creates the shared library project.
- **Foundational (Phase 2)**: Depends on Setup; establishes shared word generation, protocol language support, and retained session language. Blocks all user stories.
- **User Stories (Phases 3–6)**: Depend on the foundation. US2 and US3 also depend on US1's computer-seat naming/view model. US4 depends on the rename controls and validation behavior in US2.
- **Polish (Phase 7)**: Depends on all selected user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; establishes generated names on lobby computer seats and their active-game representation.
- **US2 (P1)**: Depends on US1's named computer-seat model and display flow.
- **US3 (P1)**: Depends on US1's named computer-seat model and shared generator; locale capture itself is enabled by Phase 2.
- **US4 (P3)**: Depends on US2's rename controls and validation messages; documentation also covers US1 and US3 behavior.
- US2 and US3 can be implemented in parallel after US1 if separate owners coordinate the shared `game-room.ts` and protocol changes.

### Within Each User Story

- Add focused tests before implementation and confirm they fail for the missing behavior.
- Complete model/contract changes before their handlers and UI integrations.
- Verify each story at its checkpoint before beginning the next dependent story.

### Parallel Opportunities

- Phase 2: T002/T003 (library word lists and tests) can proceed independently from T004/T005 (protocol) and T006/T007 session-language paths after T001 exists.
- US1: T010–T012 test files can be prepared independently; frontend display T017 can proceed independently from backend seat/name implementation after the protocol shape is fixed.
- US2: T019–T022 tests can be authored in parallel across rules, backend and frontend files; UI controls T028 can be implemented separately from backend handler work after contract T023 is agreed.
- US3: T030–T032 tests can be prepared independently; production changes in room/gateway should be coordinated because they touch the same lifecycle.
- US4: T038–T041 translation and guide files are independent; T037 translation coverage is coordinated with the final key names.
- Different user stories are not wholly independent: complete US1 before US2/US3 to avoid conflicting unnamed-seat assumptions.

## Parallel Example: User Story 1

```text
After T001:
- Workstream A: T002 and T003 (shared localized generator and its unit tests)
- Workstream B: T004 and T005 (protocol language/name types and tests)
- Workstream C: T006–T009 (session locale propagation and tests)

After Phase 2:
- Workstream A: T010–T011 (backend room and game-state tests)
- Workstream B: T012 (frontend view tests)
- Then implement T013–T016 server-side and T017 frontend display; finish with T018.
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 to deliver distinct localized names for lobby computers and consistency in a started game.
3. Stop at the US1 checkpoint; verify German gender agreement, English word membership, uniqueness, reconnect views, and elimination of `Computer N`.
4. Continue to US2 and US3 for host editing and takeover language, then US4 for translated UI/documentation.

### Incremental Delivery

1. Shared generator and language-aware protocol/session foundation.
2. US1: lobby-created computer names, propagated to game state.
3. US2: host rename in lobby and running game.
4. US3: correct-language replacement, host handover, and rejoin semantics.
5. US4: translations and user documentation.
6. Run cross-project validation and manual quickstart flows.

## Notes

- `[P]` marks work in separate files that can proceed concurrently without incomplete prerequisites.
- `[US#]` maps each story task to the corresponding specification story.
- The existing game engine maps engine-player indices to room seats; all updates must use `seatOfEngine`, not assume seat and engine indices are interchangeable.
- Host locale must be captured from the departing host before election, including the delayed disconnect/grace-expiry path.
