# Implementation Plan: Mobile lobby and game setup

**Branch**: `022-mobile-lobby` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-mobile-lobby/spec.md`; approved UX in [design.md](./design.md).

## Summary

Turn the M0 mobile shell into a working lobby: nickname and session, game list, create game, join, host and guest lobby with seats, computers, settings, ready and start, plus a "game started" notice. The mobile app gets its own thin socket service and plain-CSS components. Only the pure setup model and the translations move into a new `scope:shared` library `client-core` so mobile and desktop do not drift. Desktop behavior and tests stay unchanged. Presets are deferred.

## Technical Context

**Language/Version**: TypeScript, Angular (signals, standalone components), as the rest of the workspace.

**Primary Dependencies**: Existing only: `game-rules`, `socket.io-client`, Angular router. No new third-party dependency. One new workspace lib `client-core`.

**Storage**: No server change. Browser `localStorage` holds the existing session entry and language choice (shared with desktop).

**Testing**: Angular unit-test target for `apps/mobile` with a fake socket; Jest for `client-core` (moved specs); desktop suites unchanged; manual viewport and real-phone checks ([quickstart.md](./quickstart.md)).

**Target Platform**: Current Chrome (Android) and Safari (iOS); portrait 320-480 px wide, landscape 568-932 px wide and 320-430 px high.

**Project Type**: Web application (Nx monorepo), mobile frontend served under `/m/`.

**Performance Goals**: List and lobby updates visible within the same second as desktop; initial bundle stays under the 500 kB budget.

**Constraints**: No horizontal scrolling or zoom; touch targets >= 44 px; component styles within the 4 kB/8 kB budget; mobile depends only on `scope:shared`; protocol unchanged.

**Scale/Scope**: Six screens (nickname, list, join dialog, create, host/guest lobby, started notice), one socket service, one new lib with two moved modules.

## Constitution Check

_Pre-research gate:_

| Principle                            | Status                                                          |
| ------------------------------------ | --------------------------------------------------------------- |
| I Server-authoritative state         | Pass: client only sends intents and renders pushes.             |
| II Pure tested rules engine          | Pass: no rules logic added; shared setup logic keeps its tests. |
| III 80 % coverage                    | Pass: new components and service get unit tests.                |
| IV One container, SQLite             | Pass: no change.                                                |
| V Anonymous play, optional passwords | Pass: same nickname session, join with password.                |
| VI UX first                          | Pass: approved mockup, touch targets, both languages.           |
| VII Simplicity                       | Pass with one justified addition (Complexity Tracking).         |

_Post-design re-check:_ unchanged; no new dependency, no protocol change, preset deferral reduces scope.

## Project Structure

### Documentation (this feature)

```text
specs/022-mobile-lobby/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── design.md / mockup.html   # approved UX
├── contracts/
│   └── socket-intents.md     # intents, pushes, mobile routes
└── tasks.md                  # created by /speckit-tasks
```

### Source Code (repository root)

```text
libs/client-core/                      # new, scope:shared
├── package.json, project.json-style config (copy of libs/computer-names)
└── src/
    ├── index.ts
    └── lib/
        ├── setup.ts (+ spec)          # moved from apps/frontend/src/app/core
        └── i18n/ en.ts, de.ts (+ parity spec)   # moved from apps/frontend/src/app/i18n

apps/frontend/                         # import paths only
└── src/app/core/i18n.service.ts, setup consumers -> import from 'client-core'

apps/mobile/src/app/
├── app.ts, app.routes.ts, main.ts     # routes, shell with offline banner
├── core/
│   ├── mobile-connection.service.ts   # grows into session/lobby/game service
│   ├── session.guard.ts
│   └── i18n.service.ts                # small, uses client-core dictionaries + mobile keys
├── i18n/mobile-en.ts, mobile-de.ts    # mobile-only keys
├── nickname/ list/ join-dialog/ create-game/ game-lobby/ started/
└── styles.css                         # theme variables, touch targets, layout rules
```

**Structure Decision**: Keep the mobile client self-contained; share only pure logic through one lib.

## Complexity Tracking

| Addition              | Why needed                                                                                             | Simpler alternative rejected because                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| New lib `client-core` | Mobile may only depend on `scope:shared`; setup rules and translations must not be duplicated (FR-012) | Copying them drifts and doubles maintenance; adding them to `game-rules` mixes client text into the rules engine |
