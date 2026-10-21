# Quickstart: Mobile Delivery Foundation

This guide validates M0 after implementation. It covers the local Nx build, a one-container smoke test, and a manual candidate deployment to the isolated test instance.

## Prerequisites

- Node.js 24 and npm 11
- Docker with Buildx
- Docker Hub access to push a candidate image tag
- Portainer access to the isolated test stack
- A phone browser with access to `https://test.volle-lotte.allwang.family`

## Build and test

From the repository root:

```bash
npm ci
npx nx run mobile:build:production
npx nx run mobile:build:capacitor
npx nx run frontend:build:production
npx nx run backend:build
npx nx run mobile:lint
npx nx run mobile:typecheck
npx nx run backend:test
npx nx run mobile:test
```

Expected results:

- All Nx targets succeed from a clean checkout.
- The browser build contains an `index.html` with URLs rooted at `/m/`.
- The Capacitor build (`dist/apps/mobile-capacitor/browser`, the `webDir` in `apps/mobile/capacitor.config.ts`) contains an `index.html` with `<base href="./">`; check with `grep '<base' dist/apps/mobile*/browser/index.html` (`/m/` vs `./`).
- The desktop build still emits its current browser output.
- `mobile` can import shared libraries such as `game-rules`, and lint rejects a dependency on `scope:backend` or `scope:frontend`.

## Run the combined image locally

Build the same image that will be deployed:

```bash
docker build -t volle-lotte:mobile-local .
docker run --rm --name volle-lotte-mobile-local -p 3000:3000 volle-lotte:mobile-local
```

In a second terminal, verify:

```bash
curl --fail http://localhost:3000/
curl --fail http://localhost:3000/m/
curl --fail http://localhost:3000/m/lobby
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/config
```

Expected results:

- `/` and existing desktop deep links serve the desktop application.
- `/m/` and a nested mobile route serve the mobile application.
- `/api/health` returns the existing healthy response; `/api/config` returns runtime configuration.
- The browser can establish the existing same-origin Socket.IO connection at `/socket.io`.
- A missing mobile build asset does not cause requests for `/api` or `/socket.io` to return either SPA's `index.html`.

Stop the local container with Ctrl+C when the smoke test is complete.

## Deploy a candidate to the external test instance

Use a unique tag tied to the tested source revision; do not overwrite `latest` or the production version tag.

```bash
git rev-parse --short HEAD
docker buildx build --platform linux/amd64,linux/arm64 \
  -t walefish/volle-lotte:mobile-<short-sha> \
  --push .
```

Replace `<short-sha>` with the value from `git rev-parse`. In the test Portainer stack, set `TAG` to that exact tag and choose **Pull and redeploy**. Do not change the production stack. The test instance's SQLite volume must remain separate from production.

Verify from a phone browser:

1. Open `https://test.volle-lotte.allwang.family/m/`.
2. Confirm that the mobile shell loads and reaches the existing backend.
3. Open `https://test.volle-lotte.allwang.family/` and confirm the desktop app still loads.
4. Confirm desktop and mobile assets/API/Socket.IO are served from the test instance.

For rollback, restore the prior known-good `TAG` in the test Portainer stack and pull/redeploy. Keep the candidate image tag available until the build is no longer needed for diagnosis.

## Desktop regression

Run the existing targeted frontend tests and production build:

```bash
npx nx run frontend:test
npx nx run frontend:build:production
npx nx run backend:build
```

The existing desktop routes, runtime configuration and Socket.IO endpoint must behave as before.
