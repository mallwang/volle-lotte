# Feature Specification: Mobile Delivery Foundation

**Feature Branch**: `021-mobile-foundation`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Start M0 of the mobile app roadmap. Establish a separate mobile frontend that can be tested by real users from a test deployment and released alongside the backend. First assess what frontend logic should be reusable; extract only concrete shared needs rather than refactoring broadly. Prepare the mobile application for future native packaging, but defer emulator work."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Reach a mobile test build (Priority: P1)

As a selected tester, I want to open a mobile-specific application from a test address, so that I can try the early mobile experience on my own phone without affecting the production application.

**Why this priority**: The purpose of M0 is to put a separately delivered mobile application in front of real users early, while keeping production stable.

**Independent Test**: Deploy the M0 build to a test environment, open its mobile entry point from a phone browser, and verify that the desktop application and backend remain available.

**Acceptance Scenarios**:

1. **Given** the test environment is running the M0 release, **When** a tester opens the documented mobile entry point on a phone, **Then** the dedicated mobile application loads.
2. **Given** a tester opens the existing desktop entry point, **When** the same release is deployed, **Then** the current desktop application continues to load unchanged.
3. **Given** a tester opens the mobile application, **When** it contacts the game service, **Then** it uses the same game service as the desktop application.
4. **Given** a candidate build is deployed to the test environment, **When** it is released, **Then** it does not replace the production release unless production deployment is separately chosen.

### User Story 2 - Reuse proven shared behavior (Priority: P1)

As a maintainer, I want to know which existing client logic is safe and useful to share with the mobile app, so that the two frontends stay compatible without an unnecessary broad refactor.

**Why this priority**: The mobile client must agree with the existing game protocol, but moving UI-bound code prematurely would add risk without proven reuse.

**Independent Test**: Review the M0 reuse assessment and verify that each shared module used by the mobile app is client-neutral, has a clear reason to be shared, and is covered by relevant tests.

**Acceptance Scenarios**:

1. **Given** the existing frontend and shared libraries, **When** the mobile foundation is prepared, **Then** the reuse assessment identifies existing shared rules and any protocol or client logic required by both frontends.
2. **Given** a concrete client-neutral logic gap prevents the mobile app from integrating with the existing service, **When** it is addressed, **Then** only the required shared logic is extracted and both frontends can consume it within the established module boundaries.
3. **Given** an existing module is specific to the desktop layout or interaction model, **When** reuse is assessed, **Then** it remains in the desktop frontend unless a concrete independent shared responsibility is demonstrated.
4. **Given** shared client logic is changed or extracted, **When** the change is tested, **Then** relevant behavior is covered and existing desktop behavior remains intact.

### User Story 3 - Build a mobile release foundation (Priority: P2)

As a maintainer, I want the mobile frontend to build and ship with the existing application release, so that subsequent mobile increments can be tested without creating a separate backend service.

**Why this priority**: A reproducible delivery path makes future lobby and gameplay increments testable and keeps the current single-container deployment model.

**Independent Test**: Build the production artifacts and container, run the container, and verify that both frontend entry points, the API, and the real-time connection are available.

**Acceptance Scenarios**:

1. **Given** a clean repository checkout, **When** the production build runs, **Then** the mobile application can be built alongside the existing application.
2. **Given** the application release is started, **When** a tester requests the mobile entry point, **Then** the release serves the mobile application alongside the existing desktop application and game service.
3. **Given** the mobile application is prepared for future native packaging, **When** its web build is produced, **Then** it can be packaged without requiring an emulator or native app project in M0.

### Edge Cases

- The mobile entry point is opened directly or refreshed on a nested route.
- The mobile frontend assets are missing or fail to load while the desktop frontend remains available.
- The test deployment serves the mobile application from a different origin or path than the game service, affecting connectivity.
- Shared protocol information changes while both frontends are being built or deployed.
- No existing frontend logic can be cleanly shared beyond the current game rules and protocol types.
- A candidate mobile deployment must be rolled back without changing production state.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The product MUST provide a separately buildable mobile frontend while preserving the existing desktop frontend.
- **FR-002**: The mobile frontend MUST be reachable at `https://test.volle-lotte.allwang.family/m/` in the existing test deployment.
- **FR-003**: The mobile frontend MUST communicate with the existing game service, without introducing a separate game service.
- **FR-004**: A single application release MUST make the mobile frontend, desktop frontend, and existing game service available together.
- **FR-005**: A test release MUST have an identifier distinct from production and MUST be deployable without replacing the production release.
- **FR-006**: The M0 build MUST provide a runnable mobile application shell and establish its backend connection; mobile lobby and gameplay interactions are deferred to later increments.
- **FR-007**: Before shared code is extracted, the M0 plan MUST document the existing game rules, protocol types, and frontend client logic relevant to the mobile app, and record whether each candidate is reused, extracted, or left in place with a rationale.
- **FR-008**: New shared code MUST be limited to concrete client-neutral logic required by both frontends, and MUST follow the existing module-boundary rules.
- **FR-009**: Changes to shared logic MUST preserve existing desktop behavior and include relevant automated tests.
- **FR-010**: The mobile frontend MUST be prepared for future native packaging without requiring an emulator or native app project in M0.
- **FR-011**: The M0 release MUST NOT require user accounts, offline gameplay, PWA installation, app-store distribution, or a mobile redesign of the lobby or game table.

### Key Entities

- **Mobile frontend build**: The independently buildable mobile application shell and its web assets.
- **Test release**: A candidate application deployment available to selected testers independently of production.
- **Shared client logic**: Client-neutral rules, protocol definitions, or connectivity behavior consumed by more than one frontend.
- **Backend release**: The existing application deployment that serves the desktop frontend, API, real-time game service, and the new mobile entry point.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A selected tester can load the mobile application shell from the test deployment on a phone browser without changing the production deployment.
- **SC-002**: The mobile application can connect successfully to the same game service used by the desktop application.
- **SC-003**: One application release makes both frontend entry points and the shared game service available.
- **SC-004**: The existing desktop application completes its current smoke-test flow unchanged after the mobile frontend is added.
- **SC-005**: Every code extraction made for M0 has a documented reuse rationale and relevant automated test coverage; no broad UI refactor is required.
- **SC-006**: The repository's documented build workflow can produce the mobile frontend and the deployable backend container from a clean checkout.

## Assumptions

- M0 delivers a testable application shell and backend connectivity, not the mobile lobby or game table; those are M1 and M2.
- The test deployment is externally reachable by selected testers at `https://test.volle-lotte.allwang.family`, uses its own Docker instance and SQLite volume, and is updated manually by changing its Docker image tag. Production remains separate.
- The mobile browser application is served from the same host under `/m/`; desktop remains at the root path.
- The mobile build is a separate Nx frontend application and shares only client-neutral logic with the existing frontend.
- Capacitor is the selected future native-wrapper path, but Android Studio, emulator support, native project generation, APK distribution, and app stores are outside M0.
- Multiplayer play continues to require a connection to the existing backend.
