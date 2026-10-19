# Implementation Plan: Computer Player Names

**Branch**: `012-computer-player-names` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-computer-player-names/spec.md`

## Summary

Give every computer seat a stable, unique, host-editable display name. A pure shared Nx library will provide curated English and German adjective/noun combinations; German word entries carry grammatical gender and adjective forms. Only the server selects names, using the active host's UI language, and stores them on room seats. The existing game state must be renamed immutably when a running computer is renamed so all clients, later game views, and results agree. Player language is retained with the player/seat so a departing host's language remains available through immediate leave and delayed disconnect takeover.

The checked `unique-names-generator` package (v4.7.1) supplies English-only dictionaries and cannot produce gender-agreeing German phrases, so it is not a fit. Add no third-party dependency.

## Technical Context

**Language/Version**: TypeScript, strict mode, Node.js >=24; Angular 22 and NestJS 11 applications

**Primary Dependencies**: Existing Nx 23 monorepo, Socket.IO protocol shared through `libs/game-rules`; no new runtime package

**Storage**: In-memory sessions and game rooms; computer names and player UI languages follow existing room/session lifetime and rejoin behavior. No durable database/schema change.

**Testing**: Nx targets; Vitest for frontend and shared library unit tests, Jest for backend unit and socket-level integration tests; run relevant project tests plus affected typecheck/build.

**Target Platform**: Browser clients and the single Node.js backend service

**Project Type**: Nx web application (Angular frontend, NestJS backend, shared TypeScript libraries)

**Performance Goals**: Name assignment and rename are immediate room operations; rename broadcasts should become visible to other connected clients within one second under normal game conditions.

**Constraints**: Server-authoritative state and randomness; pure shared game/name logic with injected random source; server validates every intent; English/German UI and word lists; scope tags enforce `scope:shared`, `scope:backend`, and `scope:frontend`; protocol change requires a version increment.

**Scale/Scope**: 2–8 seats per game, at most 7 computers; generated computer names unique case-insensitively against all occupied seat names.

## Constitution Check

_Gate: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                   | Status | Plan alignment                                                                                                                                                                                     |
| ------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Server-authoritative game state          | PASS   | Name selection and collision resolution occur on the server; clients request rename and render authoritative room/game state. Randomness is injected into shared logic and supplied by the server. |
| II. Pure, tested rules engine               | PASS   | Game-state name replacement is an immutable game-rules operation with tests; the new shared generator is pure and receives a random source.                                                        |
| III. Test coverage                          | PASS   | Tests cover language forms, uniqueness, host authorization, locale lifecycle, state propagation, and regression behavior.                                                                          |
| IV. One container, SQLite, survivable games | PASS   | No persistent storage change; this follows current in-memory room/session lifetime.                                                                                                                |
| V. Anonymous play                           | PASS   | No accounts or new identity data; locale is non-sensitive session metadata.                                                                                                                        |
| VI. UX first                                | PASS   | Host-only rename affordance and translated validation feedback are included; keyboard/touch behavior and long-name presentation are checked. A UX review hook is available.                        |
| VII. Simplicity                             | PASS   | One small shared library is directly requested and is the minimal way to reuse the pure name data/logic without importing application code. No external dependency is needed.                      |

**Gate result**: PASS. No principle exception or Complexity Tracking entry is needed.

## Project Structure

### Documentation (this feature)

```text
specs/012-computer-player-names/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── computer-player-names.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── backend/src/app/lobby/
│   ├── game-room.ts                 # authoritative computer names, locale and rename operation
│   ├── lobby.gateway.ts             # session locale and rename intent validation/broadcast
│   ├── sessions.service.ts          # active UI language retained across reconnects
│   ├── view.ts                      # seat and host-language view data
│   └── *.spec.ts                    # room/session/gateway tests
└── frontend/src/app/
    ├── core/socket.service.ts        # send initial/current UI language and rename intent
    ├── game-lobby/                   # lobby computer seat name and host rename control
    ├── table/                        # running computer rename control and name rendering
    └── i18n/{en,de}.ts               # translated labels and feedback
libs/
├── game-rules/src/lib/
│   ├── protocol.ts                   # session language, named seats, rename intent and protocol version
│   ├── game.ts                       # immutable player-name update
│   └── *.spec.ts                     # protocol/game-state tests
└── computer-names/                   # new scope:shared pure bilingual generator and word lists
    └── src/lib/
        ├── english.ts
        ├── german.ts                 # gendered nouns and matching adjective forms
        ├── generate-name.ts
        └── *.spec.ts
```

**Structure Decision**: Keep the existing `game-rules` protocol as the shared contract and add the specifically requested `libs/computer-names` shared Nx library for curated data and pure generation. The backend owns generation and persisted-in-room seat names; frontend consumes room state and does not generate names. Reuse existing lobby, table, session, and translation surfaces rather than adding a service or third-party generator package.

## Phase 0: Outline & Research

See [research.md](./research.md). The main choices are resolved: current language comes from session metadata, a host's language travels with their seat through delayed departure, server generates names using its cryptographic random source, names are stored on computer seats, and a versioned Socket.IO contract carries locale/name updates.

## Phase 1: Design & Contracts

- [Data model](./data-model.md): room seats, session language, name uniqueness/validation, and transitions.
- [Realtime contract](./contracts/computer-player-names.md): language synchronization, named seat views, and host-only rename.
- [Validation guide](./quickstart.md): focused unit, integration, typecheck and manual scenarios.

## Constitution Check (Post-Design)

| Principle                                   | Status | Design evidence                                                                                                          |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| I. Server-authoritative game state          | PASS   | Contract contains only client intents; generated/renamed names are returned in authoritative room state.                 |
| II. Pure, tested rules engine               | PASS   | Name update creates a new `GameState`; generator and engine update are pure and tested.                                  |
| III. Test coverage                          | PASS   | Quickstart specifies unit, gateway, socket integration, and UI verification scenarios.                                   |
| IV. One container, SQLite, survivable games | PASS   | This feature does not introduce a persistence boundary or service.                                                       |
| V. Anonymous play                           | PASS   | Locale is associated with an existing anonymous session and is not identifying information.                              |
| VI. UX first                                | PASS   | Rename is host-only, bilingual, and must be operable with keyboard and touch; run the UX review before implementation.   |
| VII. Simplicity                             | PASS   | Shared library and contract changes directly satisfy requested language and reuse behavior without a package dependency. |

**Post-design gate result**: PASS. No unjustified complexity or constitution violation.

## Complexity Tracking

No constitution violations.
