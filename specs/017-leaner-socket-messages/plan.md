# Implementation Plan: Leaner Socket Messages

**Branch**: `017-leaner-socket-messages` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/017-leaner-socket-messages/spec.md`

## Summary

Today every accepted change makes the backend push a complete `game:state` (including the capped log of up to 500 entries, all seats and static values) to every player and spectator. The new protocol replaces it by one snapshot per entering client and small `game:change` messages after that.

- **Snapshot**: the existing `GameView` (plus a running number `n`), already returned in the acks of `session:start`, `game:join`, `game:spectate`, `game:rejoin` and `rematch:join`. New: a `game:snapshot` push for the rare structural cases (rematch, switch between the waiting view and a normal view) and a `game:sync` intent that lets a client ask for its own snapshot.
- **Change**: one `game:change` message per accepted change and recipient. It has the recipient's running number and only the named parts that changed (`game`, `seats`, `preview`, `log`, and so on). The server builds it by comparing the recipient's last sent view with the new one (`diffView`), the client applies it in a pure reducer (`applyChange`). Both functions live next to each other in `libs/game-rules`, so one round-trip test proves `apply(prev, diff(prev, next)) = next`.
- **Gap detection**: the client applies a change only if `n` is `lastN + 1`, ignores older ones, and on a gap calls `game:sync` for itself. Nobody else is affected; no server pause.
- **Measurement**: a reusable script (`npm run measure:socket`) plays full games against an in-process server and reports bytes per event, player and spectator; baseline recorded before the change.
- Compression, binary encoding and generic patches stay out (decision recorded after re-measurement).

## Technical Context

**Language/Version**: TypeScript (strict), Node 22 (NestJS 11), Angular (signals, standalone)

**Primary Dependencies**: Socket.IO (`@nestjs/websockets`, `socket.io-client`), existing `game-rules` lib; no new runtime dependency

**Storage**: N/A (the per-recipient last-sent view is kept in memory per room; SQLite persistence is untouched)

**Testing**: Jest (backend, game-rules), Vitest/Jest as configured per project (frontend), backend integration tests with real sockets (`lobby/testing/client.ts`)

**Target Platform**: single Docker container behind nginx (WebSocket)

**Project Type**: web application (Nx monorepo: `apps/frontend`, `apps/backend`, `libs/game-rules`)

**Performance Goals**: turn message size independent of log length (SC-001); at least 70% less data per player over a full 8-player game (SC-002)

**Constraints**: the client reducer stays the single place that builds the view; `PROTOCOL_VERSION` 11 → 12; no visible behaviour change; reconnect, rematch, spectators and waiting players always get a complete snapshot

**Scale/Scope**: up to 8 players plus a modest number of spectators per room; log capped at 500 entries

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status | Notes                                                                                                                                                                                       |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Server-authoritative state       | Pass   | The server still decides everything; clients only apply what it sends. The deck is still never sent.                                                                                        |
| II. Pure, tested rules engine       | Pass   | The engine is untouched. `diffView` and `applyChange` are pure functions in `libs/game-rules` (no I/O), tested by round-trip tests.                                                         |
| III. Test coverage                  | Pass   | New logic ships with tests: diff/apply round trips, gap and duplicate handling, backend resync paths, measurement script smoke test. The script itself is listed in the coverage skip list. |
| IV. One container, survivable games | Pass   | No persistence change. The protocol version is raised, so the PWA update rule (activate only in the lobby or after a game) applies unchanged.                                               |
| V. Anonymous play                   | Pass   | No new identity data; `game:sync` uses the existing session and checks membership like `game:rejoin`.                                                                                       |
| VI. UX first                        | Pass   | No UI change; a gap is repaired silently. No mockup needed (`/speckit-ux-review` skipped).                                                                                                  |
| VII. Simplicity                     | Pass   | Hand-written field groups, no generic patch library, no compression, no binary parser. See "Complexity Tracking" for the per-recipient counter.                                             |

Post-design re-check: still Pass; the only addition beyond a plain rename is the per-recipient cache (justified below).

## Project Structure

### Documentation (this feature)

```text
specs/017-leaner-socket-messages/
├── plan.md              # This file
├── research.md          # Phase 0: decisions and alternatives
├── data-model.md        # Phase 1: snapshot, change, cache, counters
├── quickstart.md        # Phase 1: how to verify
├── contracts/
│   └── protocol.md      # Phase 1: events, payloads, rules for apply/diff/resync
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
libs/game-rules/src/lib/
├── protocol.ts          # PROTOCOL_VERSION 12; GameView gains `n`; Pushes: game:snapshot, game:change; Intents: game:sync
├── view-sync.ts         # NEW: diffView(prev, next) and applyChange(view, change) (pure)
└── view-sync.spec.ts    # NEW: round-trip, groups, log append/cap, structural fallback

apps/backend/src/app/lobby/
├── view.ts              # toView stays the snapshot builder; GameStateView loses `rules`
├── view-sync.service.ts # NEW: per-room, per-recipient cache {view, n}; snapshot(), changes(), forget()
├── lobby.gateway.ts     # push() sends game:change / game:snapshot; new game:sync intent; acks use snapshot()
└── *.spec.ts            # resync paths: rejoin, reconnect, spectator, rematch, waiting player, gap

apps/backend/scripts/
└── measure-socket.ts    # NEW: plays full games (2 and 8 players, spectators), prints bytes per event

apps/frontend/src/app/core/
├── socket.service.ts    # game:change / game:snapshot handlers, lastN, gap -> game:sync
└── socket.service.spec.ts

docs/
├── roadmap.md           # R24 marked done with figures and the compression/diff decisions
└── socket-traffic.md    # NEW: baseline and result tables, how to run the measurement
```

**Structure Decision**: Existing three-project layout. The shared pure code (`diffView`, `applyChange`, types) goes to `libs/game-rules` (`scope:shared`), so frontend and backend cannot drift apart. The cache and the sending live in the backend lobby module; applying and gap handling live in the frontend `SocketService`.

## Complexity Tracking

| Choice                                             | Why Needed                                                                                                                                                                     | Simpler Alternative Rejected Because                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Running number per recipient, not per room         | A room-wide number would show a false gap for any client that receives no message for a change (for example the waiting player behind the game-over screen, or a hidden part). | A room counter needs a "no-op" message to every client for every change, which wastes the bytes this feature saves.                                                                 |
| Server-side cache of the last sent view per client | `diffView` needs the previous view of exactly this client (views differ per player: `you`, waiting view, spectator).                                                           | Changing all 25 mutating room methods to emit named changes would touch the rules-adjacent room code, multiply the risk, and make "everything is covered" hard to prove or to test. |
| One `game:change` message with optional parts      | One accepted change often touches several parts (bank: scores, current player, log entries). One message means one atomic apply and one number.                                | Many small events would need one number each and can leave a client between two of them; ordering and partial states would have to be handled.                                      |
