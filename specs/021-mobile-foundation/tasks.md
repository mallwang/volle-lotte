---
description: 'Implementation tasks for the mobile delivery foundation'
---

# Tasks: Mobile Delivery Foundation

**Input**: Design documents from `/specs/021-mobile-foundation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/mobile-entry.md](./contracts/mobile-entry.md), [quickstart.md](./quickstart.md)

**Tests**: Include automated tests for new client and backend routing behavior, and run the documented Nx and container smoke checks. Tests for code changes must be written before implementation.

**Organization**: Tasks are grouped by user story. Setup and foundational tasks establish the app boundary and complete the required reuse assessment first.

## Phase 1: Setup

**Purpose**: Establish the mobile Angular project using the workspace's existing Nx conventions.

- [ ] T001 Create the Angular mobile application project and minimal app entry points under `apps/mobile/`, following `apps/frontend/project.json` and the existing Angular application conventions.
- [ ] T002 Add the `scope:mobile` dependency constraint to `eslint.config.mjs` so the mobile project may depend on `scope:shared` projects only; tag the project in `apps/mobile/project.json`.

---

## Phase 2: Foundational

**Purpose**: Complete the required shared-code assessment before mobile integration work.

- [ ] T003 Verify the reuse assessment against `libs/game-rules/src/lib/protocol.ts`, `libs/computer-names/`, `apps/frontend/src/app/core/socket.service.ts`, and the setup/table helpers; update `specs/021-mobile-foundation/research.md` with each candidate's reuse/extraction/leave-in-place decision and rationale before extracting any code.

**Checkpoint**: The mobile project boundary and shared-code decisions are ready; user-story work can proceed.

---

## Phase 3: User Story 1 - Reach a mobile test build (Priority: P1) 🎯 MVP

**Goal**: A selected tester can open a mobile shell at `/m/`, connect to the existing backend, and use it without affecting the desktop entry point or production.

**Independent Test**: Build and run the combined Docker image; verify `/m/` and a nested mobile route serve the mobile shell, the shell reaches the same-origin API and Socket.IO service, `/` still serves desktop, and API/Socket.IO requests do not receive an SPA fallback.

### Tests for User Story 1

- [ ] T004 [P] [US1] Add mobile shell rendering and route tests in `apps/mobile/src/app/app.spec.ts`, covering the initial shell and direct loading of the mobile entry route.
- [ ] T005 [P] [US1] Add mobile backend-connection tests in `apps/mobile/src/app/core/mobile-connection.service.spec.ts`, covering same-origin runtime configuration and Socket.IO connection behavior.
- [ ] T006 [P] [US1] Add backend static-routing tests in `apps/backend/src/main.spec.ts`, covering `/m/`, nested mobile routes, mobile assets, desktop routes, and API/Socket.IO fallback exclusions.

### Implementation for User Story 1

- [ ] T007 [US1] Implement the minimal mobile application shell and mobile route in `apps/mobile/src/app/`, with no lobby or gameplay UI.
- [ ] T008 [US1] Implement the mobile connection integration in `apps/mobile/src/app/core/mobile-connection.service.ts`, using the existing same-origin backend and shared protocol types rather than copying protocol declarations or extracting the desktop `SocketService`.
- [ ] T009 [US1] Configure the production browser build base path as `/m/` and its browser output in `apps/mobile/project.json` and `apps/mobile/src/index.html`.
- [ ] T010 [US1] Serve mobile static assets and nested-route fallback from a separate `MOBILE_WEB_ROOT` asset root in `apps/backend/src/main.ts`, before desktop fallback, while preserving `/api` and `/socket.io` behavior.
- [ ] T011 [US1] Update `Dockerfile` to build the mobile browser target, set `MOBILE_WEB_ROOT`, and copy its browser assets into the runtime image alongside the existing desktop assets and backend.
- [ ] T012 [US1] Update `specs/021-mobile-foundation/quickstart.md` with the actual mobile Nx targets, one-container smoke checks, unique candidate image tag deployment, test-stack rollback, and desktop regression steps.

**Checkpoint**: The combined image serves the mobile browser app and existing desktop/API/Socket.IO routes independently.

---

## Phase 4: User Story 2 - Reuse proven shared behavior (Priority: P1)

**Goal**: Keep both clients compatible by reusing existing client-neutral contracts and avoiding speculative shared abstractions.

**Independent Test**: Review the final reuse assessment and mobile imports; verify shared protocol types come from `libs/game-rules`, no duplicate protocol declarations exist, and any extracted shared behavior has tests and preserves desktop behavior.

### Implementation for User Story 2

- [ ] T013 [US2] Compare the implemented mobile imports and any shared-code changes with the assessment in `specs/021-mobile-foundation/research.md`; record the final rationale there, keep UI/framework-coupled code in `apps/frontend/`, and add relevant tests in the affected `libs/` project if a concrete client-neutral extraction was required.

**Checkpoint**: The mobile app reuses only justified shared behavior, and the code-sharing decision is traceable.

---

## Phase 5: User Story 3 - Build a mobile release foundation (Priority: P2)

**Goal**: Prepare a distinct Capacitor-ready web build without adding native platform projects or changing the combined backend release model.

**Independent Test**: Build both mobile targets; confirm the browser output uses `/m/`, the Capacitor output uses relative asset URLs, and `capacitor.config.ts` points `webDir` to the latter output containing `index.html`.

### Implementation for User Story 3

- [ ] T014 [US3] Add matching `@capacitor/core` and `@capacitor/cli` dependencies on the same major version selected in `specs/021-mobile-foundation/research.md` to the root `package.json` and `package-lock.json`, without adding `@capacitor/android`, `@capacitor/ios`, Ionic UI, or the `@nxext/capacitor` plugin.
- [ ] T015 [US3] Add `apps/mobile/capacitor.config.ts` with app ID `family.allwang.vollelotte.mobile`, app name `Volle Lotte`, and an explicit `webDir` for the relative-base Capacitor output.
- [ ] T016 [US3] Add a separate relative-base Capacitor build configuration and output path in `apps/mobile/project.json`, keeping it distinct from the `/m/` browser build and outside the Docker runtime assets.
- [ ] T017 [US3] Verify both mobile build outputs and the configured Capacitor `webDir`; update `specs/021-mobile-foundation/quickstart.md` with the exact commands and expected asset-base checks.

**Checkpoint**: Capacitor can consume the mobile web assets without requiring native project generation or emulator tooling.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate M0 as a complete release increment and document the real test deployment procedure.

- [ ] T018 Run the documented mobile, desktop, backend, lint, typecheck, and unit-test targets from `specs/021-mobile-foundation/quickstart.md`; resolve failures in the affected project files.
- [ ] T019 Build and smoke-test the combined Docker image using the routes in `specs/021-mobile-foundation/contracts/mobile-entry.md`; confirm desktop, mobile, API, and Socket.IO behavior together.
- [ ] T020 Deploy a uniquely tagged candidate image to the isolated test stack by following `specs/021-mobile-foundation/quickstart.md`; verify the phone-browser mobile entry and desktop entry, and confirm production and its data volume remain unchanged.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No prerequisites. T001 precedes T002 because the project tag is added to the generated project.
- **Foundational (Phase 2)**: Depends on setup; the reuse decision must be checked before mobile integration or shared-code extraction.
- **User Story 1 (Phase 3)**: Depends on setup and the reuse assessment. Its shell/connectivity/backend tests can be written in parallel, then implementation and Docker integration proceed.
- **User Story 2 (Phase 4)**: Depends on User Story 1 so the final audit can compare the actual mobile imports with the assessed candidates.
- **User Story 3 (Phase 5)**: Depends on the mobile project from setup. It follows User Story 1 because both build configurations modify `apps/mobile/project.json`.
- **Polish (Phase 6)**: Depends on all three user stories; candidate deployment follows a successful local build and container smoke test.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Setup and Foundational; can be independently tested in a local combined container before the external test deployment.
- **User Story 2 (P1)**: Follows User Story 1 to verify actual reuse; it does not require broad extraction if no concrete shared gap exists.
- **User Story 3 (P2)**: Follows the browser build setup in User Story 1; it does not require Android/iOS platform projects.

### Parallel Opportunities

- T004, T005, and T006 write tests in separate project files and can run in parallel after Setup and Foundational.
- Within User Story 1, T007 and T008 can be implemented in parallel once their tests exist; T010 can proceed independently of mobile UI implementation after T006.
- User Story 3 tasks T015 and T016 touch separate files and can be developed in parallel after T014, provided the chosen `webDir` and output path are agreed.
- The stories are not fully independent: deployment testing requires the combined image from User Story 1, and the final reuse audit verifies its implemented imports.

## Parallel Example: User Story 1

```text
Task: T004 Add mobile shell rendering and route tests in apps/mobile/src/app/app.spec.ts
Task: T005 Add mobile backend-connection tests in apps/mobile/src/app/core/mobile-connection.service.spec.ts
Task: T006 Add backend static-routing tests in apps/backend/src/main.spec.ts
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational tasks (T001-T003).
2. Complete User Story 1 (T004-T012).
3. Validate the local combined image and mobile/desktop/API/Socket.IO behavior.
4. Stop for an MVP review before publishing a candidate image to the isolated test stack.

### Complete M0

1. Complete User Story 2 (T013) and verify that the implemented reuse matches the codebase assessment.
2. Complete User Story 3 (T014-T017) to prepare the Capacitor asset output.
3. Run the cross-cutting checks and deploy only a unique candidate image to the isolated test stack.
4. Do not add native projects, PWA service-worker behavior, or mobile lobby/gameplay UI in M0.
