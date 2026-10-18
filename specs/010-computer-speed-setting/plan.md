# Implementation Plan: Computer Player Speed Setting

**Branch**: `010-computer-speed-setting` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-computer-speed-setting/spec.md`; approved layout in [design.md](design.md).

## Summary

The host picks a computer speed (1 slow ... 5 fast, default 3) in the game lobby or the running game. One server-side pacing table, shared through `libs/game-rules`, maps the step to the waits between a computer's actions (pause before an action, margin after a throw, pick highlight, turn-result notice). Today's hard-coded values become step 2; the default step 3 is clearly faster. The setting rides on the existing `game:settings` intent and `GameView`, protocol version 5. After every accepted change the server pushes a `game:settingsChanged` message to all humans in the room; the client shows it as a toast (lobby and table). The existing "fast computer dice" switch stays and joins the same toast path. A shared `HostSettings` component (slider and switch) is used in the lobby panel and the table settings dialog.

## Technical Context

**Language/Version**: TypeScript (Node 22 backend, Angular frontend), per existing workspace

**Primary Dependencies**: NestJS + Socket.IO, Angular + PrimeNG (`p-slider`, `p-toggleswitch`, toast). No new dependency.

**Storage**: None. The setting lives in the in-memory `GameRoom`; nothing is persisted or remembered between games.

**Testing**: Jest (backend, `libs/game-rules`), Vitest (frontend); gateway socket specs; manual e2e flows stay out of CI.

**Target Platform**: Desktop browsers (target of specs 007-009), Linux container

**Project Type**: Web application (Nx monorepo: `apps/frontend`, `apps/backend`, `libs/game-rules`)

**Performance Goals**: At the default step a human waits at least 25% less between their turns (modelled turn in a unit test, SC-001); step 5 is below a third of step 1 (SC-002).

**Constraints**: Human turn limits and the client dice animation stay unchanged (FR-013, FR-015). Server and client must read the same pacing table (the client needs the notice length).

**Scale/Scope**: Up to 8 seats, 1 setting added, 1 setting reused; about 10 source files touched.

## Constitution Check

| Principle                     | Assessment                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| I. Server-authoritative state | Pass. The server validates the host and the step, owns the pacing. The client only displays and sends the intent.        |
| II. Pure, tested rules engine | Pass. The pacing table is a pure function in `libs/game-rules` with unit tests; no rules change.                         |
| III. Test coverage            | Pass. Tests for pacing, `GameRoom`, gateway, socket service, slider component, lobby, dialog, table notice.              |
| IV. Survivable games          | Pass. Speed is plain room state; it joins the persisted state when R4 (save/load) arrives and resets to default on load. |
| V. Anonymous play             | Not affected.                                                                                                            |
| VI. UX first                  | Pass. Mockup approved ([design.md](design.md)); keyboard-operable slider, visible value, no colour-only information.     |
| VII. Simplicity               | Pass. One new setting on the existing intent and view, no new service; one shared component instead of two copies.       |

Re-check after design: no violations, Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/010-computer-speed-setting/
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
libs/game-rules/src/lib/
├── pacing.ts            # NEW: COMPUTER_SPEEDS, DEFAULT_SPEED, pacing(step)
├── pacing.spec.ts       # NEW: monotonic table, step 2 = legacy values, SC-001/SC-002 model
└── protocol.ts          # computerSpeed, settings payload, game:settingsChanged, PROTOCOL_VERSION 5

apps/backend/src/app/lobby/
├── game-room.ts         # computerSpeed, setSettings(partial), pacing-driven delays, reschedule on change
├── lobby.gateway.ts     # validate payload, push game:settingsChanged
├── view.ts              # computerSpeed in GameView
└── *.spec.ts            # room, gateway, view

apps/frontend/src/app/
├── core/socket.service.ts        # settings(partial), settingsChanged toast
├── shared/host-settings.ts       # NEW: slider + fast dice switch, host/guest mode, debounce
├── game-lobby/game-lobby.ts      # settings panel
├── table/settings-dialog.ts      # uses HostSettings
├── table/table.ts                # notice length from the pacing table
├── i18n/en.ts, de.ts             # labels, hints, toast texts
└── *.spec.ts

docs/: user-guide.md (settings, new pacing), roadmap.md (move to Done)
```

**Structure Decision**: Existing three-project layout. The shared pacing table lives in `libs/game-rules` (scope:shared) because server and client both need it; no new project.

## Complexity Tracking

No constitution violations.
