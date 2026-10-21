# Data Model: Mobile Delivery Foundation

M0 introduces no new persisted game or user data. Existing game state, player identities, and session data remain owned by the current backend and its SQLite database. The mobile client consumes the existing game and protocol types from `libs/game-rules`.

## Delivery Artifacts

### Mobile frontend build

- **Represents**: The independently built Angular mobile shell and its static browser assets.
- **Attributes**: Nx project identity, browser output path and base path (`/m/`), relative-base Capacitor output path, Capacitor app identity, Capacitor `webDir`.
- **Relationships**: Bundled into the backend Docker image; served by the backend under `/m/`; connects to the backend's existing `/api` and `/socket.io`.
- **Validation**: Both build outputs contain `index.html`; browser assets and routes resolve under `/m/`; Capacitor `webDir` resolves to the separate relative-base output.

### Candidate Docker image

- **Represents**: One immutable application build for manual test deployment.
- **Attributes**: Image repository, unique candidate tag, source commit.
- **Relationships**: Contains desktop assets, mobile assets, and backend runtime; deployed to the isolated test stack by setting its `TAG`.
- **Validation**: The test stack pulls the requested tag and continues using only its own SQLite volume; production keeps its existing image tag.

### Test deployment

- **Represents**: The externally reachable instance used by selected testers.
- **Attributes**: Host `test.volle-lotte.allwang.family`, mobile path `/m/`, deployed image tag, isolated SQLite volume.
- **Relationships**: Serves the mobile and desktop applications and the same backend instance; is operationally separate from production.
- **State transitions**: Current tag → manually selected candidate tag → prior known-good tag for rollback.
- **Validation**: Verify the host, tag and volume before redeployment; verify `/m/`, `/`, `/api/health`, `/api/config` and `/socket.io` after deployment.

## Existing Shared Contract

`libs/game-rules` remains the shared source for protocol version and typed game messages. M0 does not create another protocol entity or copy its definitions into the mobile app.
