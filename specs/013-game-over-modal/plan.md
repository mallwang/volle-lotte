# Implementation Plan: Game-Over Modal

**Branch**: `013-game-over-modal` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-game-over-modal/spec.md`

## Summary

Replace the separate result page with a modal on top of the finished table. The game page shows the table for every phase except the lobby; the table opens a non-dismissable game-over modal once the last roll animation and the last turn notice are over. The server stops restoring a finished game on `session:start` and releases the returning player from it, so a reload or reconnect lands in the games list. A player leaving a finished game keeps their seat (and name) in the room's seat list, so the table behind the modal of the others stays intact. The winner gets a repeating confetti celebration, built as a reusable app-wide service on top of `party-js` (the library behind the author's ReAIity Guesser confetti), lazy loaded, skipped for `prefers-reduced-motion`.

## Technical Context

**Language/Version**: TypeScript, strict mode, Node.js >=24; Angular 22 and NestJS 11 applications

**Primary Dependencies**: Existing Nx 23 monorepo, PrimeNG dialog, Socket.IO protocol from `libs/game-rules`; one new runtime package, `party-js` 2.2.0 (MIT, ships its own types), imported lazily

**Storage**: In-memory sessions and rooms; no schema change

**Testing**: Vitest (frontend, shared), Jest (backend); `npm run test`, `lint`, `typecheck`, `build` through Nx; the UI is verified once with Playwright (skill `verify-ui`)

**Target Platform**: Browser clients and the single Node.js backend

**Project Type**: Nx web application (Angular frontend, NestJS backend, shared libraries)

**Performance Goals**: Modal visible within 1 s after the final roll and notice; the celebration adds no cost for non-winners (the library chunk is only fetched for a winner)

**Constraints**: Server-authoritative state; no protocol shape change (`PROTOCOL_VERSION` stays); English and German texts; module boundaries (`scope:*`) unchanged; `prefers-reduced-motion` respected; modal must not be scaled or clipped by the table stage

**Scale/Scope**: 2-8 seats per game; one modal, one service, one small backend rule

## Constitution Check

_Gate: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                   | Status | Plan alignment                                                                                                                                                     |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Server-authoritative game state          | PASS   | The result and winner come from the server's game state; the server alone decides that a finished game is not restored. The client only presents.                  |
| II. Pure, tested rules engine               | PASS   | No rules change. The winner-to-seat mapping reuses the existing `playerSeats` helper.                                                                              |
| III. Test coverage                          | PASS   | Room, gateway, guard, modal, table and celebration get unit tests in the same change; coverage skip list unchanged.                                                |
| IV. One container, SQLite, survivable games | PASS   | The package is bundled by the frontend build (no CDN, single origin). No persistence change.                                                                       |
| V. Anonymous play                           | PASS   | No identity change.                                                                                                                                                |
| VI. UX first                                | PASS   | Keyboard operable, focus on the single button, dialog semantics from PrimeNG, reduced motion respected, winner message in text (not animation only).               |
| VII. Simplicity                             | PASS   | One new dependency, justified by the explicit request to reuse the author's confetti effect (see Complexity Tracking); no new library project, no protocol change. |

**Gate result**: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/013-game-over-modal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── game-over-modal.md
├── checklists/
│   └── requirements.md
└── tasks.md              # created by /speckit-tasks
```

### Source Code (repository root)

```text
apps/
├── backend/src/app/lobby/
│   ├── game-room.ts            # leave/disconnect in a finished room keeps the seat as departed
│   ├── lobby.gateway.ts        # session:start releases a returning player from a finished game
│   └── *.spec.ts               # room and gateway tests
└── frontend/src/app/
    ├── core/
    │   ├── celebration.ts      # new: start/stop confetti bursts, lazy party-js, reduced motion
    │   ├── leave-game.ts       # leaving a finished game by navigation also leaves the room
    │   └── socket.service.ts   # no "server restarted" warning when the held game was finished
    ├── game/game.ts            # table for every phase except lobby; result page removed
    ├── table/
    │   ├── game-over.ts        # new: the modal (ranking, winner, back button)
    │   └── table.ts            # shows the modal after roll and notice
    ├── result/                 # removed
    └── i18n/{en,de}.ts         # new texts, result.* removed
docs/                           # user guide (en, de), roadmap
```

**Structure Decision**: Keep everything inside the existing apps. The celebration lives in `core/` (the frontend's shared-service folder) so the starting-player draw (R17) can inject it; a separate Nx library is unnecessary for one frontend-only service.

## Phase 0: Outline & Research

See [research.md](./research.md): where the modal lives, how a finished room treats leaving players, the reload rule, the celebration library choice and its reduced-motion handling, and when the modal may open.

## Phase 1: Design & Contracts

- [Data model](./data-model.md): seat transitions in a finished room, modal visibility and winner derivation.
- [Contract](./contracts/game-over-modal.md): changed server behaviour (`session:start`, `game:leave`, disconnects) and the UI contract of the modal and the celebration service.
- [Validation guide](./quickstart.md): unit, integration and manual scenarios.

## Constitution Check (Post-Design)

| Principle                                   | Status | Design evidence                                                                                             |
| ------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| I. Server-authoritative game state          | PASS   | The release on reload is a server rule; the client has no say.                                              |
| II. Pure, tested rules engine               | PASS   | Untouched.                                                                                                  |
| III. Test coverage                          | PASS   | Quickstart lists the tests per layer.                                                                       |
| IV. One container, SQLite, survivable games | PASS   | Bundled dependency, no CDN.                                                                                 |
| V. Anonymous play                           | PASS   | Untouched.                                                                                                  |
| VI. UX first                                | PASS   | Winner text, focus, keyboard, reduced motion, non-blocking confetti (pointer events pass through).          |
| VII. Simplicity                             | PASS   | One dependency and one service; the server rule reuses the existing computer-seat shape instead of a state. |

**Post-design gate result**: PASS.

## Complexity Tracking

| Violation                 | Why Needed                                                                             | Simpler Alternative Rejected Because                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| New dependency `party-js` | The author asked to reuse the confetti effect of ReAIity Guesser, which is built on it | A hand-written particle canvas is more code to maintain and test than the library; the lazy import keeps it out of the main bundle |
