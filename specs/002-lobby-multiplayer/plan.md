# Implementation Plan: Lobby and multiplayer

**Branch**: `002-lobby-multiplayer` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-lobby-multiplayer/spec.md`

## Summary

Anonymous players (nickname plus server-issued token) create and join password-protected games, prepare them in a game lobby (seats, computers, ready), and play turns over Socket.IO. The NestJS backend owns all games in memory, applies every intent through the pure engine in `libs/game-rules` with `crypto.randomInt`, and broadcasts a sanitized state snapshot. Computer players use a new pure strategy function in `libs/game-rules` and act through the same validation path as humans, paced by timers. The Angular frontend gets functional screens only (see [design.md](design.md)); styling is a later feature. Details: [research.md](research.md), [data-model.md](data-model.md), [contracts/socket-protocol.md](contracts/socket-protocol.md), [quickstart.md](quickstart.md).

## Technical Context

**Language/Version**: TypeScript (strict), Node >= 22, Angular ~22, NestJS 11

**Primary Dependencies**: new in backend: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`; new in frontend: `socket.io-client`. Password hashing uses `node:crypto` scrypt, rate limiting and timers are plain code (no new dependency).

**Storage**: none in this feature; games, sessions and logs live in memory (persistence is the save/load feature)

**Testing**: Jest (backend, game-rules per existing setup) and the frontend's existing runner; backend integration tests with `socket.io-client` against a Nest testing app on a random port

**Target Platform**: Linux server (one container later), modern browsers on phones and desktops

**Project Type**: web application (Nx monorepo: frontend, backend, shared lib)

**Performance Goals**: every action visible to all 8 players within 1 s (SC-002); several games in parallel without influence (SC-007)

**Constraints**: server-authoritative; no secrets in logs; single process (no horizontal scaling, rooms are process-local)

**Scale/Scope**: friends-and-family scale, tens of concurrent games at most, 2-8 seats each

## Constitution Check

_GATE: passed before Phase 0, re-checked after Phase 1 design._

| Principle                    | Status | Note                                                                                                                                                                                                                     |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I Server-authoritative       | Pass   | Clients send intents only; every intent goes through `applyAction`; dice and deck via `crypto.randomInt`; snapshots hide the deck.                                                                                       |
| II Pure, tested engine       | Pass   | The computer strategy is pure, lives in `libs/game-rules` and takes an injected `RandomInt`. Protocol types are type-only.                                                                                               |
| III Test coverage            | Pass   | Unit tests for strategy, rate limiter, password, room logic; socket integration tests for the flows; gateway wiring is covered by integration tests, bootstrap files stay on the skip list.                              |
| IV One container, survivable | Defer  | "Persist after every turn" is out of scope by spec (Assumptions); the dedicated save/load feature adds it. Room state is a plain serializable object plus `toJSON` of the engine state, so that feature needs no rework. |
| V Anonymous, protected       | Pass   | Token plus nickname, scrypt-hashed password, per-client-and-game rate limit, tokens and passwords never logged or broadcast.                                                                                             |
| VI UX first                  | Pass   | Layout follows the approved mockup; tap, keyboard operable controls, 44 px targets; styling deferred by decision.                                                                                                        |
| VII Simplicity               | Pass   | Only the Socket.IO packages are added; no HTTP API, no database, no throttler or hash library. See Complexity Tracking for the one structural choice.                                                                    |

Post-design re-check: unchanged; no new violations from data model or contracts.

## Project Structure

### Documentation (this feature)

```text
specs/002-lobby-multiplayer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── socket-protocol.md
├── spec.md, design.md, mockup.html, checklists/
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
libs/game-rules/src/lib/
├── computer.ts          # chooseAction(state, difficulty, rng): pure strategy (easy/medium/hard)
├── computer.spec.ts
└── protocol.ts          # wire types only: intents, acks, views, PROTOCOL_VERSION

apps/backend/src/app/lobby/
├── lobby.module.ts
├── lobby.gateway.ts     # Socket.IO handlers: validate payload, call registry, ack
├── game-registry.service.ts  # all games, list, create/join/leave, cleanup timers
├── game-room.ts         # one game: seats, ready, host, engine state, log, grace/pace timers
├── sessions.service.ts  # token <-> player, single active connection
├── password.ts          # scrypt hash/verify (timing-safe)
├── attempt-limiter.ts   # failures per client+game, lock
└── view.ts              # GameRoom -> GameView (no deck, hidden difficulty)
(each with a *.spec.ts; gateway flows in lobby.gateway.spec.ts)

apps/frontend/src/app/
├── core/socket.service.ts   # connection, token in localStorage, signals for state
├── nickname/, lobby/, create-game/, game-lobby/, table/, result/  # functional screens, one component each
└── app.routes.ts            # routes + guards (no session -> nickname)
```

**Structure Decision**: existing Nx layout; backend feature in one `lobby` folder, shared wire types in `libs/game-rules` (already `scope:shared`), frontend one folder per screen from design.md.

## Complexity Tracking

| Deviation                                                  | Why Needed                                                                                          | Simpler Alternative Rejected Because                                                                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Wire types in `libs/game-rules` instead of a dedicated lib | Frontend and backend must share the contract and only `scope:shared` libs are allowed to be shared. | A new `libs/protocol` is one more project to build, lint and tag for type-only code; revisit if the protocol outgrows the rules lib. |
| Principle IV persistence deferred                          | Spec scopes persistence to the save/load feature.                                                   | Adding SQLite here would pull a database dependency and migration code into a feature that does not need it yet.                     |
