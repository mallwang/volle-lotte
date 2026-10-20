# Implementation Plan: Finer Socket Diffs and Compact Log

**Branch**: `018-finer-socket-diffs` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-finer-socket-diffs/spec.md`

## Summary

After spec 017 a `game:change` still repeats the whole `game` part (all players with names and scores, the whole turn with default values) whenever anything in it changes, and every log entry carries its own time stamp and a nested `data.type`. In the recorded 4-player round a card draw costs 747 bytes, of which about 650 are the `game` part.

- **Game difference** (Story 1): `GameChange` gets `gameDiff` next to the whole `game`. `game` is only sent when the recipient has no game yet (or `null` to clear it); `gameDiff` holds the changed player fields by index, `current`, the changed turn fields (`null` = no turn), `result` and `deckSize`. `version` travels in snapshots only. `diffView` computes it, `applyChange` applies it, the round-trip test of spec 017 proves the equality.
- **Compact log** (Story 2): on the wire the log is a list of groups `{ at, seat?, e: [...] }`. Consecutive entries with the same time stamp share one group (and their seat if all have the same one); an entry's `kind` is flat (`thrown` instead of `turn` plus `data.type`) and the event fields sit beside it. `encodeLog` and `decodeLog` live in `libs/game-rules` and are exact inverses, so the client still holds the same `LogEntry[]` and the table, the notices and the log text stay untouched. The compact form is used in snapshots (acks and `game:snapshot`) and in changes alike.
- **No redundant values** (Story 3): the client clears `turnDeadline` itself when a change moves the turn or pauses the game, so the server omits a `turnDeadline: null` that this rule produces. `you` becomes a partial (only changed flags).
- **Short keys** (Story 4): built only if a measured estimate after Stories 1 to 3 shows at least 25% saving per player in the 8-player game (FR-012). The measurement script computes the estimate with a throw-away key table; the real shared table is not built unless the gate passes.
- **Measurement and decisions** (Story 5): `npm run measure:socket -- --label v13`, the figures and decisions go into `docs/socket-traffic.md`. `PROTOCOL_VERSION` 12 → 13; the existing `versionMismatch` answer of `session:start` already refuses an old client and the frontend already shows the reload message (checked and covered by a test).

## Technical Context

**Language/Version**: TypeScript (strict), Node 22 (NestJS 11), Angular (signals, standalone)

**Primary Dependencies**: Socket.IO, existing `game-rules` lib; no new runtime dependency

**Storage**: N/A (the per-recipient last-sent view stays in memory per room, as in spec 017)

**Testing**: Jest (backend, `game-rules`), frontend unit tests as configured, backend integration tests with real sockets (`lobby/testing/client.ts`); measurement via `scripts/measure-socket.mjs`

**Target Platform**: single Docker container behind nginx (WebSocket)

**Project Type**: web application (Nx monorepo: `apps/frontend`, `apps/backend`, `libs/game-rules`)

**Performance Goals**: card draw message in a 4-player game at least 60% smaller (SC-001); at least 50% less data per player and per spectator over a full 8-player game than the 0.37 MB of spec 017, reached by Stories 1 to 3 alone (SC-002, SC-003)

**Constraints**: the client view is still built in one place (`applyChange`, plus one decode helper for snapshots); `GameView` and `LogEntry` as the UI uses them do not change; running number, gap detection, `game:sync` and its rate limit stay as in spec 017; no visible behaviour change; engine and rules untouched

**Scale/Scope**: up to 8 players plus a modest number of spectators per room; log capped at 500 entries

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                             | Check                                                                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Server-authoritative game state    | Pass. The server still decides what each recipient may see; the client only applies differences. Nothing about dice, deck or intents changes.                                         |
| II. Pure, tested rules engine         | Pass. The engine is not touched. `diffView`, `applyChange`, `encodeLog` and `decodeLog` are pure functions in `libs/game-rules` with unit and round-trip tests.                       |
| III. Test coverage                    | Pass. Differences per change type, equality with a fresh snapshot over real games, log encode/decode round trip, v12 client refused, gateway sequence tests (see quickstart).         |
| IV. One container, SQLite, survivable | Pass. No persistence change. Protocol version is raised (13); the existing version check keeps an old client from mid-game use.                                                       |
| V. Anonymous play                     | Pass. No identity or token change; spectators receive the same differences without what they may not see.                                                                             |
| VI. UX first                          | Pass. No visible change by requirement (FR-010); no UI work, so no `/speckit-ux-review`.                                                                                              |
| VII. Simplicity                       | Pass. No new dependency; compression, binary encoding and CSV strings stay out; the shared key table is gated by a measurement. See research R7 for the one added concept (wire log). |

Post-design re-check: still passes; no entry in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/018-finer-socket-diffs/
├── plan.md              # This file
├── research.md          # Phase 0: decisions with alternatives
├── data-model.md        # Phase 1: GameStateDiff, WireLogGroup, partial you, deadline rule
├── quickstart.md        # Phase 1: how to verify
├── contracts/
│   └── protocol.md      # Phase 1: protocol version 13
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
libs/game-rules/src/lib/
├── protocol.ts          # GameChange.gameDiff, you as partial, WireLogGroup, WireView, PROTOCOL_VERSION 13
├── view-sync.ts         # diffView / applyChange: game diff, partial you, deadline rule, wire log
├── game-diff.ts         # new: diffGame / applyGameDiff (pure)
├── wire-log.ts          # new: encodeLog / decodeLog (pure, exact inverses)
└── *.spec.ts            # unit and round-trip tests next to each file

apps/backend/src/app/lobby/
├── view-sync.service.ts # encodes the log of snapshots and changes at the send boundary
├── lobby.gateway.ts     # acks return the wire view
├── measure/socket-traffic.measure.ts  # key-table estimate for the Story 4 gate
└── *.spec.ts            # gateway sequence tests, v12 client refused

apps/frontend/src/app/core/
└── socket.service.ts    # one `adopt()` helper decodes every snapshot (acks and game:snapshot)

docs/
├── socket-traffic.md    # figures, savings per story, decisions
└── roadmap.md           # R25 to Done
```

**Structure Decision**: the existing three projects. Everything that both sides must agree on (types, diff, apply, log codec) sits in `libs/game-rules` next to the spec 017 code, so one round-trip test covers server and client logic; backend and frontend only call it at their send and receive boundaries.

## Complexity Tracking

No constitution violations.
