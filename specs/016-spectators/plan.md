# Implementation Plan: Spectators

**Branch**: `016-spectators` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-spectators/spec.md`; approved layout in [design.md](design.md).

## Summary

Visitors join a running game as anonymous, read-only spectators. The server keeps a per-room in-memory set of connected spectator session ids, never touches the seats, turn timers or the log for them, and pushes the same `game:state` to them as to players (plus a spectator count). The host gets one new setting, `spectating` (default on); turning it off sends every spectator back to the lobby. The protocol gains one intent (`game:spectate`), three view fields and one summary field, so `PROTOCOL_VERSION` goes from 10 to 11. The frontend adds a "Watch" button in the games list (reusing the password dialog), a spectator variant of the table (no play controls, counter, banner), a reduced settings dialog and the host switch.

## Technical Context

**Language/Version**: TypeScript (strict), Node 22, Angular 20 frontend, NestJS 11 backend

**Primary Dependencies**: existing only (Socket.IO via `@nestjs/websockets`, PrimeNG); no new dependency

**Storage**: none new; spectators are in memory only (not persisted, spec assumption)

**Testing**: Jest (backend and `libs/game-rules`), Angular unit tests (Jest/Vitest as configured), backend gateway tests, optional e2e flow (`npm run test:e2e`)

**Target Platform**: single Docker container, browser PWA (desktop and phone)

**Project Type**: Nx monorepo web application (`apps/frontend`, `apps/backend`, `libs/game-rules`)

**Performance Goals**: spectator sees an action within 1 s (SC-002); spectator join/leave changes push one `game:state` per participant, same cost as an existing connection change

**Constraints**: no spectator limit; spectators never influence timers, cleanup or game end (FR-008); no log entry, toast or sound for join/leave (FR-007)

**Scale/Scope**: touches `libs/game-rules/protocol.ts`, `lobby.gateway.ts`, `game-room.ts`, `view.ts`, `sessions.service.ts`, `game-registry.service.ts`, frontend `socket.service.ts`, `lobby.ts`, `table.ts`, `settings-dialog.ts`, `host-settings.ts`, `game-over.ts`, `game-view.ts`, `en.ts`/`de.ts`, docs

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                     | Status | Notes                                                                                                                                                  |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Server-authoritative state | Pass   | Spectators send no game intents; the server rejects every play intent from a spectator session. Spectators receive the same view as players (no deck). |
| II. Pure, tested rules engine | Pass   | No rule change; nothing added to the engine. Protocol types live in `libs/game-rules` as today.                                                        |
| III. Test coverage            | Pass   | Tests in the same change: room, gateway, view, frontend components and services; target stays at 80% per project.                                      |
| IV. One container, survivable | Pass   | Spectators are transient by design and not persisted. `PROTOCOL_VERSION` bump (10 to 11) uses the existing lobby-only update flow.                     |
| V. Anonymous play, passwords  | Pass   | Spectators use the existing anonymous session; protected games require the same password and rate limit. No secrets logged.                            |
| VI. UX first                  | Pass   | Layout approved via `/speckit-ux-review` ([design.md](design.md)); touch and keyboard operable controls, counter not conveyed by colour alone.         |
| VII. Simplicity               | Pass   | One intent, one setting, one counter, no new dependency or push type (reuses `game:state`, `game:closed`). No list or removal of single spectators.    |

**Post-design re-check**: unchanged, all pass. See Complexity Tracking (empty).

## Project Structure

### Documentation (this feature)

```text
specs/016-spectators/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── protocol.md      # Phase 1: socket intents, pushes, view fields
├── design.md            # UX review (approved)
├── mockup.html          # UX review mockup
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
libs/game-rules/src/lib/protocol.ts          # PROTOCOL_VERSION 11, GameView/GameSummary/GameSettings/Intents/Pushes
apps/backend/src/app/lobby/
├── sessions.service.ts                      # Session.spectating (room id)
├── game-room.ts                             # spectating flag, spectators set, summary().spectatable
├── game-registry.service.ts                 # (cleanup unchanged; spectators never count)
├── view.ts                                  # spectator view (you.spectator, spectators, spectating)
└── lobby.gateway.ts                         # game:spectate, leave/reconnect/close handling, settings
apps/frontend/src/app/
├── core/{socket.service,game-view}.ts       # spectate(), isSpectator(), toasts
├── lobby/lobby.ts                           # Watch button, password dialog reuse
├── table/{table,settings-dialog,game-over}.ts
├── shared/host-settings.ts                  # "Allow spectators" switch
└── i18n/{en,de}.ts                          # new texts
docs/{roadmap.md,rules.md?}, README(.de).md  # R8 done, user docs
```

**Structure Decision**: Existing three-project layout. No new project or library; all changes extend the lobby module in the backend and the table/lobby components in the frontend.

## Complexity Tracking

No constitution violations to justify.
