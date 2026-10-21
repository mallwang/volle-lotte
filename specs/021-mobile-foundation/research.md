# Research: Mobile Delivery Foundation

## Decisions

### Add an independent Angular application to the existing Nx workspace

- **Decision**: Add `apps/mobile` as an Angular application using the workspace's existing Angular build and test conventions. Tag it `scope:mobile` and explicitly constrain that tag to depend only on `scope:shared`.
- **Rationale**: Nx already manages Angular, has workspace defaults for application generation, and caches `@angular/build:application` and unit-test tasks. A separate app satisfies M0 without changing the desktop application's screen structure. The mobile scope needs an explicit ESLint dependency constraint; merely assigning a new tag does not add a constraint by itself.
- **Alternatives considered**: Reuse the current frontend with responsive routes (rejected: R3 specifies a separate app); create an Ionic UI application (rejected: Ionic UI is not required for Capacitor and would add a dependency without an M0 need).
- **Sources**: Repository `nx.json`, `apps/frontend/project.json`, `eslint.config.mjs`; Nx [Angular application generator](https://nx.dev/docs/technologies/angular/generators), [task pipeline](https://nx.dev/docs/concepts/task-pipeline-configuration), and [module-boundary enforcement](https://nx.dev/docs/features/enforce-module-boundaries).

### Reuse rules and protocol types; do not extract the current socket service preemptively

- **Decision**: Reuse `libs/game-rules` as the source of rule and protocol types. Keep the current desktop SocketService and UI-bound helpers in `apps/frontend` unless the M0 inventory identifies a specific, client-neutral dependency that the second app actually needs.
- **Rationale**: `libs/game-rules/src/lib/protocol.ts` exports `PROTOCOL_VERSION` and client-facing protocol types already consumed by desktop and backend. The existing `apps/frontend/src/app/core/socket.service.ts` directly depends on Angular signals and injection, PrimeNG `MessageService`, i18n, and Socket.IO. Extracting it now would couple M0 to desktop UX behavior rather than create a neutral client contract.
- **Alternatives considered**: Move all frontend core code into shared libraries (rejected: broad and UI/framework-coupled); duplicate game protocol declarations (rejected: creates drift against the existing shared contract).
- **Sources**: Repository `libs/game-rules/src/lib/protocol.ts`, `apps/frontend/src/app/core/socket.service.ts`, and `.specify/memory/constitution.md` principles II and VII.

### Serve the mobile browser application under `/m/` on the existing origin

- **Decision**: The desktop remains at `/`; the mobile SPA is served at `/m/` and nested mobile routes fall back to the mobile `index.html`. Both clients use the same-origin `/api` and `/socket.io` endpoints. Apply the mobile asset base path at build time.
- **Rationale**: It preserves the desktop URL and lets the mobile app share the existing test host, reverse proxy, runtime config and game service without cross-origin configuration. The prefix must be handled before the desktop catch-all and excluded from the desktop fallback.
- **Alternatives considered**: Mobile subdomain (rejected for M0: needs separate DNS/proxy configuration); user-agent redirect (rejected: obscures user choice and complicates asset/update behavior); serve both apps at `/` (rejected: collision).
- **Sources**: Repository `apps/backend/src/main.ts`, `apps/frontend/src/app/core/socket.service.ts`, `apps/frontend/project.json`, and `apps/frontend/src/index.html`.

### Deploy candidate builds manually to the existing isolated test stack

- **Decision**: Use `https://test.volle-lotte.allwang.family/m/` for external phone testing. Build and push a unique, immutable candidate Docker tag (for example `mobile-<short-commit-sha>`), then manually set the test Portainer stack's `TAG` to that tag and pull/redeploy. Keep production on its existing release tag. Roll back by restoring the previous test tag.
- **Rationale**: The maintainer confirmed the test instance already exists at `https://test.volle-lotte.allwang.family`, currently runs version `v0.0.6`, and has a separate Docker instance and SQLite volume. The existing Portainer compose already parameterizes `TAG`; manual deployment fits the current operating model and does not require a new production release workflow.
- **Alternatives considered**: Automatically promote test builds to production (rejected: unsafe); use the production `latest` tag for testing (rejected: not independently reproducible); provision a new staging environment (rejected: an existing isolated instance is available).
- **Sources**: Maintainer confirmation; repository `docker-compose.portainer.yml`, `Dockerfile`, `.github/workflows/release.yml`, and `README.md`.

### Prepare Capacitor without generating native projects

- **Decision**: Add matching `@capacitor/core` and `@capacitor/cli` dependencies on the same major (Capacitor 8.x at plan time) and a typed Capacitor config under the mobile app. Set `webDir` explicitly to a relative-base Capacitor build output, separate from the browser build output. Use `family.allwang.vollelotte.mobile` as the app ID and `Volle Lotte` as the app name. Do not add `@capacitor/android`, `@capacitor/ios`, or native platform folders in M0.
- **Rationale**: Official documentation supports adding Capacitor to an existing modern web project and makes `webDir` the path from which built web assets are loaded. The browser build needs an absolute `/m/` base, while the packaged native shell needs relative asset paths; separate outputs avoid one target's URL assumptions breaking the other. Nx's output path differs from Capacitor's generic examples, so it must be verified rather than left to framework auto-detection. Android tooling is explicitly deferred.
- **Alternatives considered**: Ionic Framework UI (not required); assume default `www` output (incorrect for the Nx app output); create Android project now (outside M0 and not needed to release browser builds).
- **Sources**: Capacitor [getting started](https://capacitorjs.com/docs/getting-started), [configuration](https://capacitorjs.com/docs/config), [web support](https://capacitorjs.com/docs/web), and [workflow](https://capacitorjs.com/docs/basics/workflow).

### Keep the mobile app inside the existing Docker image and backend release

- **Decision**: Build the mobile app alongside `frontend` and `backend`, copy its browser output to a dedicated runtime directory, and make the backend serve that directory under `/m/`. Keep the existing Docker image as the deployable unit. Do not add `mobile` as an independently published Nx Release project unless implementation reveals it needs a separately versioned package.
- **Rationale**: The Dockerfile already builds frontend and backend and copies the frontend browser bundle into the NestJS runtime. The mobile build must be wired explicitly into build dependencies and image copies because a static asset copy is not inferred from TypeScript imports. The app is not independently deployed or published; the backend image and its tag contain both frontends.
- **Alternatives considered**: A second backend/container (rejected: conflicts with the one-container principle); assume Nx build graph detects the static-file dependency (rejected: it does not follow Docker `COPY` references); version and publish a separate mobile package (rejected: M0 ships web assets inside the backend image).
- **Sources**: Repository `Dockerfile`, `apps/backend/project.json`, `nx.json`, `.github/workflows/release.yml`; Nx [task pipeline configuration](https://nx.dev/docs/concepts/task-pipeline-configuration).

### Use distinct browser and Capacitor asset bases

- **Decision**: Configure one production browser build with base href `/m/` and a second Capacitor-ready build with a relative base href. Copy only the browser build into the backend image; set Capacitor `webDir` to the relative-base build.
- **Rationale**: The browser app is served beneath `/m/`, but a future Capacitor WebView loads bundled assets from its own local origin. An absolute `/m/` base would request the wrong path in that WebView. Distinct build outputs keep the test PWA path and native asset loading independent.
- **Alternatives considered**: Reuse one `/m/` build for Capacitor (rejected: absolute paths are rooted at the WebView origin); serve mobile from `/` or a new subdomain (rejected for M0: collides with desktop or requires extra DNS/proxy setup).
- **Sources**: Capacitor [configuration](https://capacitorjs.com/docs/config) and [workflow](https://capacitorjs.com/docs/basics/workflow); repository `apps/frontend/src/index.html` and mobile same-origin routing decision above.

## Repository Reuse Assessment

| Candidate                               | Current location and role                                                                                      | M0 treatment and rationale                                                                                                                                                                                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game rules and display/protocol types   | `libs/game-rules`, tagged `scope:shared`; imported by backend and desktop frontend                             | **Reuse** the existing library directly. It already provides the shared, client-neutral game and protocol contract, so copying or extracting it would create duplication.                                                                                                                    |
| Generated computer names                | `libs/computer-names`, tagged `scope:shared`                                                                   | **Leave in the shared library** and consume only if the M0 shell needs it. It is already framework-neutral; no extraction or new abstraction is needed.                                                                                                                                      |
| Socket transport, session and reconnect | `apps/frontend/src/app/core/socket.service.ts`; Angular/PrimeNG/i18n coupled                                   | **Leave in the desktop frontend**; do not extract wholesale because it is coupled to desktop framework and UX services. The mobile shell may use a minimal client-specific connectivity integration; defer shared socket abstractions until both clients demonstrate a concrete common need. |
| Setup and settings helpers              | `apps/frontend/src/app/core/setup*.ts`; UI-facing consumers and storage may be coupled                         | **Leave in the desktop frontend** for M0. There are no mobile setup flows yet, and extracting helpers before identifying a concrete client-neutral requirement would broaden scope without reuse value.                                                                                      |
| Table sizing and UI components          | `apps/frontend/src/app/core/table-scale.ts`, `apps/frontend/src/app/table`, and `apps/frontend/src/app/shared` | **Leave in the desktop frontend**. M0 has no mobile gameplay layout, and viewport/table sizing is presentation-specific.                                                                                                                                                                     |

## Resolved Questions

- **Test host and deployment**: Existing isolated test instance at `https://test.volle-lotte.allwang.family`; test SQLite volume is separate. Candidate image tags are deployed manually in Portainer.
- **Mobile route**: `/m/` on the same origin.
- **Shared frontend extraction**: No broad refactor. Existing `game-rules` already contains the protocol contract; extraction depends on evidence from the focused inventory.
- **Native platform**: Capacitor config only in M0; emulator and native projects are deferred.
- **Release tooling**: Keep the desktop/backend release group unchanged unless the mobile project generator produces a separately versioned distributable. The mobile browser build is bundled into backend image tags.

## Final Reuse Audit (implemented)

- `apps/mobile` imports `PROTOCOL_VERSION` from `game-rules` only; no protocol declaration is copied.
- `MobileConnectionService` is a ~20-line connectivity signal over `socket.io-client`; the desktop `SocketService` stays in `apps/frontend`. No shared-code extraction was needed, so no `libs/` changes or tests were added.
- `computer-names`, setup helpers and table sizing are not used by the M0 shell and stay where they are.
- Capacitor: `@capacitor/core` and `@capacitor/cli` 8.x as root devDependencies; `apps/mobile/capacitor.config.ts` points `webDir` at `dist/apps/mobile-capacitor/browser`.
- Backend routing moved from `main.ts` into `apps/backend/src/serve-frontend.ts` (so it is unit-testable without booting the app); `MOBILE_WEB_ROOT` is served at `/m/`.
