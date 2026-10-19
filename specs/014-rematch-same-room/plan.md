# Implementation Plan: Rematch in the Same Room

**Branch**: `014-rematch-same-room` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-rematch-same-room/spec.md`

**Design**: [design.md](./design.md), mockup [mockup.html](./mockup.html)

## Summary

The host of a finished game turns the same room back into a lobby with one click. The room keeps its id, password, settings, seat order and the computers the host set up; seats of humans who left, and computers that replaced humans, are freed. Humans still in the game-over modal get a new `reserved` seat and keep seeing the finished table with an active "Rejoin" until they rejoin, leave, are removed, or the host starts. Starting drops the remaining reservations. A room round counter and a frozen snapshot of the finished game make late requests of an earlier round harmless. Two new intents (`rematch:start`, `rematch:join`), one new seat state, one new error and a protocol bump (9 to 10) carry it; the rules engine is untouched.

## Technical Context

**Language/Version**: TypeScript, strict mode, Node.js >=24; Angular 22 and NestJS 11 applications

**Primary Dependencies**: Existing Nx 23 monorepo, PrimeNG, Socket.IO; no new dependency

**Storage**: In-memory sessions and rooms; no schema change

**Testing**: Vitest (frontend, shared), Jest (backend); `npm run test`, `lint`, `typecheck`, `build` through Nx; the UI is verified once with Playwright (skill `verify-ui`)

**Target Platform**: Browser clients and the single Node.js backend

**Project Type**: Nx web application (Angular frontend, NestJS backend, shared protocol types in `libs/game-rules`)

**Performance Goals**: The lobby appears for the host in the same round trip as the click; reserved players see "Rejoin" active within one push

**Constraints**: Server-authoritative state; `PROTOCOL_VERSION` 9 to 10; English and German texts; module boundaries (`scope:*`) unchanged; no change to the rules engine or to computer behaviour

**Scale/Scope**: 2-8 seats per game; one new seat state, two intents, one error code, one log kind

## Constitution Check

_Gate: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                   | Status | Plan alignment                                                                                                                                |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Server-authoritative game state          | PASS   | Round, reservations, who may rejoin and when the room is a lobby are decided on the server; the client only sends intents carrying its round. |
| II. Pure, tested rules engine               | PASS   | No rules change; a new game is created by the existing `start`.                                                                               |
| III. Test coverage                          | PASS   | Room, view, gateway and UI get tests in the same change; coverage skip list unchanged.                                                        |
| IV. One container, SQLite, survivable games | PASS   | Protocol version is raised so outdated clients are told to update; no persistence in the backend yet.                                         |
| V. Anonymous play                           | PASS   | Identity stays nickname plus token; reservations are bound to the player id; password stays required for newcomers only.                      |
| VI. UX first                                | PASS   | Reviewed with `/speckit-ux-review` (design.md); keyboard operable buttons, disabled state explained in text, status by text and icon.         |
| VII. Simplicity                             | PASS   | No new dependency or service; one seat state and a per-room snapshot, justified in Complexity Tracking.                                       |

**Gate result**: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/014-rematch-same-room/
├── plan.md
├── spec.md
├── design.md
├── mockup.html
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rematch-protocol.md
├── checklists/
│   └── requirements.md
└── tasks.md              # created by /speckit-tasks
```

### Source Code (repository root)

```text
libs/game-rules/src/lib/
└── protocol.ts                    # PROTOCOL_VERSION 10; intents rematch:start, rematch:join; GameView.round/rematch/you.reserved; SeatView 'reserved'; ErrorReason 'staleRound'; LogKind 'rematch'

apps/
├── backend/src/app/lobby/
│   ├── game-room.ts               # round, reserved seat, archive snapshot, rematch(), rematchJoin(), start drops reservations, leave/removeSeat/summary/takenNames handle reserved
│   ├── view.ts                    # archived view for reserved and dropped players; round, rematch, you.reserved
│   ├── lobby.gateway.ts           # rematch:start, rematch:join; pushes reach reserved/dropped watchers; session:start releases a reservation; closed() notifies them
│   └── *.spec.ts                  # room, view, gateway and e2e tests
└── frontend/src/app/
    ├── core/
    │   ├── socket.service.ts      # rematch(), rejoinRematch()
    │   └── game-view.ts           # helpers for the rematch state of a view
    ├── table/game-over.ts         # Rematch (host), Rejoin states (guest), hints
    ├── game-lobby/game-lobby.ts   # reserved seat row, rematch tag, remove button
    └── i18n/{en,de}.ts            # new texts, log.rematch
docs/                              # user guide (en, de), rules (lobby section), roadmap (R7 done)
```

**Structure Decision**: Keep everything inside the existing apps and the shared protocol file. The rematch is a room state transition, so it lives in `GameRoom` next to `start` and `leave`; views stay in `view.ts`; the frontend keeps its phase-driven page switch (`finished` shows the table and modal, `lobby` shows the lobby), so reserved players stay on the modal simply because their view stays `finished`.

## Phase 0: Outline & Research

See [research.md](./research.md): same room versus new room, how reserved players keep seeing the finished table, what the round marker protects, what happens to leavers, replaced seats and reloads, reservation versus the existing computer-takeover rejoin, and the start with missing players.

## Phase 1: Design & Contracts

- [Data model](./data-model.md): room round and archive, the `reserved` seat, seat transitions at rematch and start, the views each kind of player gets.
- [Contract](./contracts/rematch-protocol.md): new intents, error, view fields, push rules and the stale-round rules.
- [Validation guide](./quickstart.md): unit, integration and manual scenarios.

## Constitution Check (Post-Design)

| Principle                                   | Status | Design evidence                                                                                                       |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| I. Server-authoritative game state          | PASS   | Every transition (rematch, join, drop, free) happens in `GameRoom`; the client round is only compared, never trusted. |
| II. Pure, tested rules engine               | PASS   | Untouched.                                                                                                            |
| III. Test coverage                          | PASS   | Quickstart lists the tests per layer, including the stale-round cases.                                                |
| IV. One container, SQLite, survivable games | PASS   | Protocol bump; reserved players of an old client get `versionMismatch` on reconnect like any outdated client.         |
| V. Anonymous play                           | PASS   | Reservations key on the anonymous player id; no new identity data.                                                    |
| VI. UX first                                | PASS   | Matches the approved mockup; no information by colour alone (tags carry text).                                        |
| VII. Simplicity                             | PASS   | See Complexity Tracking.                                                                                              |

**Post-design gate result**: PASS.

## Complexity Tracking

| Violation                                                  | Why Needed                                                                                                          | Simpler Alternative Rejected Because                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New seat state `reserved` (touches `SeatView` consumers)   | A reservation must hold a seat for one player without being a human: no ready flag, no timers, not counted to start | A human seat with `connected=false` would block the ready rule and trigger grace timers and cleanup; a computer-with-`former` seat would be played by the engine |
| Per-room snapshot of the finished game for waiting players | Reserved players must keep seeing the finished table and ranking while the room is already a lobby                  | A client-side cache of the last finished view changes every reader of `socket.game()` and lets the server not tell a waiting client from a stale one             |
