# Implementation Plan: Mobile Delivery Foundation

**Branch**: `021-mobile-foundation` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-mobile-foundation/spec.md`

## Summary

Create a second, independently buildable Angular application in the Nx workspace and serve its browser build under `/m/` from the existing NestJS container. The mobile shell will use the same-origin API and Socket.IO endpoints as desktop. Build a second relative-base asset output for Capacitor's explicitly configured `webDir`, without generating native projects. The existing test instance at `https://test.volle-lotte.allwang.family` has its own SQLite volume; candidate Docker images will use a distinct immutable tag and be pulled into the test stack manually. A focused reuse assessment precedes any extraction: `libs/game-rules` already supplies client-facing game protocol types, while the current socket service is coupled to Angular, PrimeNG notifications and i18n and remains in the desktop frontend unless a specific shared need emerges.

## Technical Context

**Language/Version**: TypeScript 6.0, Node.js 24, Angular 22.2

**Primary Dependencies**: Nx 23.1.1, Angular build application executor, NestJS 11, Socket.IO client/server, `@capacitor/core` and `@capacitor/cli` 8.x (kept on the same major)

**Storage**: No new storage. The existing test deployment has an isolated SQLite volume; production data remains separate.

**Testing**: Nx build, lint, typecheck and unit-test targets; container-level HTTP and Socket.IO smoke checks; existing desktop regression checks. A phone browser check uses the externally reachable test URL.

**Target Platform**: Existing Node.js container and modern mobile/desktop browsers. Android and iOS tooling are not required for M0.

**Project Type**: Nx monorepo with Angular web applications, NestJS backend and shared TypeScript libraries.

**Performance Goals**: No additional numeric latency target. The mobile shell and its hashed assets must load through the existing backend without delaying or breaking the desktop entry point.

**Constraints**: Preserve root desktop URLs; use `/m/` for the mobile browser build and a separate relative-base output for Capacitor; route mobile requests to a separate SPA asset root; preserve `/api` and `/socket.io`; one backend container; no service worker or offline promise in M0; manually deploy a unique image tag to the isolated test stack; do not add Android/iOS platform projects.

**Scale/Scope**: One new Angular application shell, the minimum targeted shared-code changes justified by the reuse assessment, one mobile static asset root, and the test-image deployment procedure. Lobby and game-table UX belong to M1/M2.

## Constitution Check

### Pre-Design Gates

- **I. Server-authoritative game state — PASS.** The mobile shell adds no rule decisions or client-authoritative game state; game actions remain under the current server protocol.
- **II. Pure, tested rules engine — PASS.** Reuse `libs/game-rules`; do not move rules into either frontend.
- **III. Test coverage — PASS.** Any new shared behavior receives relevant tests. Build and container smoke tests cover the new delivery path; existing desktop behavior is regression-checked.
- **IV. One container, SQLite, survivable games — PASS.** Both frontends and the existing backend remain in one container. The test instance uses its own SQLite volume and is never pointed at production data.
- **V. Anonymous play, optional lobby passwords — PASS.** No accounts or new identity system are introduced.
- **VI. UX first — PASS WITH DEFERRED UI REVIEW.** M0 is a runnable shell, not the mobile lobby/table. Touch-first screen design and its UX review happen in M1/M2.
- **VII. Simplicity — PASS.** No general desktop/mobile component refactor. Capacitor packages/config are limited to what is needed to prepare the selected native path; native platforms and PWA installation are deferred.
- **Architecture — PASS.** The mobile app receives a `scope:mobile` tag constrained to depend only on `scope:shared` libraries. Shared libraries stay framework-neutral.

**Gate result**: PASS. No unresolved architecture or governance violation blocks design.

### Post-Design Gate

- A separate mobile app is required by R3 and M0; keeping it out of desktop UI avoids duplicating desktop layout assumptions.
- `/m/` is a same-origin entry path, so the mobile shell can use `/api` and `/socket.io` without CORS or a second backend.
- A mobile asset root and SPA fallback are narrowly scoped; the existing root frontend fallback remains the default everywhere else.
- The existing manually operated test stack is used, with a distinct Docker image tag and a dedicated database volume. There is no automatic promotion to production.
- Capacitor core/CLI and its app config are added without Android/iOS platform packages or generated native projects. The browser build uses `/m/`; a separate build output uses a relative base for native asset loading, and `webDir` points explicitly to this output.
- **Gate result**: PASS. Complexity is justified only by the explicitly required second frontend and separate URL surface; see Complexity Tracking.

## Phase 0: Research

See [research.md](./research.md). Decisions are resolved: retain existing rules/protocol sharing; use `/m/`; use the existing isolated test instance and manual tag deployment; and set Capacitor's `webDir` explicitly to a relative-base Nx build output distinct from the browser build.

## Phase 1: Design & Contracts

- [Data model](./data-model.md): deployment/build artifacts and shared-code assessment; no new persisted game entity.
- [Mobile entry contract](./contracts/mobile-entry.md): `/m/` routing, same-origin service paths and deployment behavior.
- [Quickstart](./quickstart.md): build, container smoke tests, desktop regression and manual test-instance deployment.

## Project Structure

### Documentation (this feature)

```text
specs/021-mobile-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── mobile-entry.md
```

### Source Code (repository root)

```text
apps/
├── backend/
│   └── src/main.ts                  # Existing desktop root and /m/ static/SPA routing
├── frontend/                        # Existing desktop application, behavior preserved
└── mobile/
    ├── project.json                 # Separate Nx application, scope:mobile
    ├── capacitor.config.ts          # Capacitor identity and explicit Nx webDir
    └── src/                         # Minimal mobile shell and same-origin connectivity
libs/
├── game-rules/                      # Existing shared rules and protocol contracts
└── computer-names/                  # Existing shared client-neutral names
Dockerfile                           # Build and copy both frontend outputs into one runtime image
eslint.config.mjs                    # Enforce scope:mobile -> scope:shared boundaries
nx.json                              # Existing executor defaults; release configuration reviewed
```

**Structure Decision**: Nx monorepo option 2 (web application) extended with a second web frontend under `apps/mobile`. The new app has an explicit `scope:mobile` boundary and reuses existing `scope:shared` projects. Its browser assets are served from `/m/`; the backend and desktop frontend remain the sole game service and root app.

## Complexity Tracking

| Added complexity                                | Why required                                                                                                           | Simpler alternative rejected because                                                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Second Angular frontend                         | M0/R3 explicitly requires a separately built mobile client; this lets later mobile UI evolve independently of desktop. | Reusing the desktop app would not establish a separately delivered mobile client and would couple future mobile layouts to desktop assumptions.        |
| Second static asset root and `/m/` SPA fallback | The same backend image must serve the desktop root and mobile app from distinct entry points.                          | A separate app service or origin adds deployment and CORS complexity; serving both at `/` would replace or ambiguously route the existing desktop app. |
| `scope:mobile` ESLint dependency constraint     | A new project tag without a matching constraint would not reliably enforce the intended shared-only dependency rule.   | Reusing `scope:frontend` would hide the distinct app boundary and make future desktop/mobile constraints harder to express.                            |
| Separate immutable candidate image tag          | The existing test stack is manually deployed and production must not be changed by candidate builds.                   | Reusing `latest` or the production version tag could make a test deployment pull or promote the wrong artifact.                                        |
