# Implementation Plan: Open Lobbies, Rejoin, Leave Warning and Turn Timers

**Branch**: `006-open-lobby-rejoin-timers` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-open-lobby-rejoin-timers/spec.md`; approved layout in [design.md](design.md) / [mockup.html](mockup.html).

## Summary

Four server-side behaviour changes plus their UI: (1) games may be created without a password and are then joinable in one tap in the lobby phase; (2) the host can close an occupied human seat, which bans that identity for the game; (3) leaving a running game (after a confirm modal) or losing the connection for 30 s hands the seat to a random-difficulty bot immediately, with no host decision; the bot remembers the former player, who can reclaim the seat via a Rejoin button; (4) the server enforces per-phase turn timers (draw/throw 10 s, select 15 s, decide 15 s) that start after the dice animation, auto-act on expiry, and replace a player by a bot after 3 consecutive timeouts. The only engine addition is a pure `skipTurn`. Protocol goes to v3. See [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript, Node 24, Angular 22.2 (signals, standalone), NestJS

**Primary Dependencies**: existing only (PrimeNG Dialog/Button/Tag, socket.io); no new dependency

**Storage**: in-memory `GameRoom` (banned set, former player, turn deadline); the player session token already lives in the browser (existing session storage), nothing new persisted

**Testing**: Vitest/Jest as in the repo; fake timers for grace, turn timers and timeout counting; room unit tests for ban/rejoin/bot takeover; engine test for `skipTurn`; component tests for lobby list, modals, countdown

**Target Platform**: Browsers (desktop/phone, light/dark), Linux container

**Project Type**: web application (Nx monorepo: `apps/frontend`, `apps/backend`, `libs/game-rules`)

**Performance Goals**: one `setTimeout` per room for the turn timer; client countdown driven by a server deadline (`turn.deadlineAt`), no per-second server pushes

**Constraints**: timer starts after the roll animation (reuse the 005 roll durations: roll max 3 s + 250 ms margin as the start delay); exactly one action when expiry and a player action race (single-threaded room, first wins, timer cleared in `apply`); all new texts EN + DE; touch targets ≥ 44 px

**Scale/Scope**: ≤ 8 seats per game; 2 new intents (`game:rejoin`, `seat:remove`), 1 removed (`host:decide`), protocol v3

## Constitution Check

| Principle                | Result               | Notes                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I Server-authoritative   | Pass                 | Timers, auto-actions, ban, and rejoin identity are all decided on the server; the client only renders `turn.deadlineAt`.                                                                                                                                                                                                                                          |
| II Pure rules engine     | Pass                 | Engine gets one pure function `skipTurn(state)`; no timers or I/O in `libs/game-rules`. Timer logic lives in `GameRoom`.                                                                                                                                                                                                                                          |
| III Test coverage        | Pass                 | Tests listed under Testing; ≥ 80 % kept.                                                                                                                                                                                                                                                                                                                          |
| IV One container, SQLite | Pass                 | No new service. `PROTOCOL_VERSION` 2 → 3 per the `protocolVersion` rule. Persistence not built yet; banned set / former player are plain room fields and will be persisted with the room when that lands.                                                                                                                                                         |
| V Anonymous play         | **Amendment needed** | The constitution says games are created with a password. Optional password is a MINOR change (v1.1.0): "a game MAY be password-protected; open games are joinable by anyone in the lobby phase". Rejoin uses the existing anonymous session only (no account, no code), so the principle's spirit holds. Amend via `/speckit-constitution` before implementation. |
| VI UX first              | Pass                 | `/speckit-ux-review` done; confirm modal for destructive leave, visible countdown, warning before the third timeout, announced rejoin.                                                                                                                                                                                                                            |
| VII Simplicity           | Pass                 | Timeouts reuse existing actions (`draw`/`throw`/`bank`); bot takeover reuses the existing computer seat; the host-decision flow (`host:decide`, `pending`, disconnect banner) is deleted, a net removal.                                                                                                                                                          |

Re-check after design: unchanged; only the Principle V amendment remains open.

## Project Structure

### Documentation (this feature)

```text
specs/006-open-lobby-rejoin-timers/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/protocol.md
├── design.md / mockup.html
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.specify/memory/constitution.md            # Principle V amendment (v1.1.0)
libs/game-rules/src/lib/
├── game.ts                                # skipTurn(state): pure, next player, no points
└── protocol.ts                            # PROTOCOL_VERSION 3, seat/view/summary/intent changes, LogKinds
apps/backend/src/app/lobby/
├── game-room.ts                           # banned set, former player, bot takeover, turn timer, timeout counter; remove pending/decide
├── lobby.gateway.ts                       # optional password, 'game:rejoin', 'seat:remove'; drop 'host:decide'
├── game-registry.service.ts               # summaries: open flag, rejoinable-for list
├── view.ts                                # deadline, timeouts warning, former player, remove pending/graceEndsAt as needed
└── sessions.service.ts                    # (reads only) rejoin looks up the session's player in room seats
apps/frontend/src/app/
├── lobby/lobby.ts                         # open/protected/running badges, Join/Rejoin buttons
├── create-game/create-game.ts             # password optional
├── game-lobby/game-lobby.ts               # Close seat, removal modal
├── table/
│   ├── table.ts                           # leave confirm modal, countdown, timeout warning, back toast
│   ├── turn-timer.ts                      # countdown bar from deadlineAt (new)
│   └── disconnect-banner.ts               # deleted
├── core/socket.service.ts                 # rejoin intent, close reason
└── i18n/{en,de}.ts                        # all new texts
```

**Structure Decision**: Extend the existing lobby module and table components; one new small component (`turn-timer`) and one pure engine function. No new library or module.

## Complexity Tracking

No violations beyond the Principle V amendment (a documented MINOR change, not a complexity trade-off).
