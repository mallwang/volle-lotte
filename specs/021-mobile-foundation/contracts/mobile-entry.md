# Mobile Entry and Connectivity Contract

## Browser routes

| Request                             | Required behavior                                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /m/`                           | Serve the mobile application entry document.                                                                                                     |
| `GET /m/<client-route>`             | Serve the mobile application entry document for a direct navigation or refresh of a mobile client route.                                         |
| `GET /m/<asset>`                    | Serve the requested mobile static asset from the mobile build output.                                                                            |
| `GET /` and existing desktop routes | Preserve the current desktop application behavior.                                                                                               |
| `GET /api/health`                   | Preserve the existing backend health response.                                                                                                   |
| `GET /api/config`                   | Preserve current runtime configuration behavior for the desktop client; the mobile client uses the same endpoint if it needs that configuration. |
| `/socket.io`                        | Preserve the existing Socket.IO transport and protocol behavior for both clients.                                                                |

The mobile path must be handled before the desktop SPA fallback. API and Socket.IO requests must not be captured by either frontend fallback. The `/m/` route and all mobile assets are same-origin; M0 adds no separate game service or cross-origin allowance.

## Browser build path

- The browser build uses `/m/` as its base path, so router navigation and asset URLs remain inside the mobile entry point.
- Capacitor configuration names the app and points `webDir` at a separate Nx output built with a relative base path. Do not copy this Capacitor output into the backend image.
- The browser and Capacitor build outputs must both contain an `index.html`; M0 verifies the configured `webDir` exists without adding a native platform.
- M0 registers no service worker and makes no offline-availability promise.

## Test deployment

- Base URL: `https://test.volle-lotte.allwang.family`
- Mobile entry point: `https://test.volle-lotte.allwang.family/m/`
- Deployment: push a unique candidate image tag, then manually update and pull/redeploy the test Portainer stack.
- Isolation: test and production use distinct container instances and SQLite volumes.
- Rollback: restore the previous test stack tag and redeploy; do not change production during test rollback.

## Compatibility

The existing protocol version and message schemas in `libs/game-rules` are authoritative. M0 must not introduce a second copy of those types or change the server's game protocol.
