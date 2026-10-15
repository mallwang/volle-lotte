# Volle Lotte

Online multiplayer web app (PWA) for the dice game _Volle Lotte_ (Tutto), 2-8 players, computer opponents.
Hosting: https://volle-lotte.allwang.family. A single Docker container (NestJS serves API, WebSocket and the Angular build), SQLite on a volume.

Ported from the Java Swing version (`java/apps/games/volle-lotte`). Game rules: [docs/rules.md](docs/rules.md).
Developed with [Spec-Kit](https://github.com/github/spec-kit) (`/speckit-*`); principles in `.specify/memory/constitution.md`.

## Status

Workspace, CI (lint, typecheck, test, build, SonarCloud), the constitution and the pure rules engine (`libs/game-rules`, spec 001) are in place; lobby and multiplayer (spec 002) is implemented: a NestJS Socket.IO gateway (password-protected games, 2-8 seats, computer players, reconnect with a 60 s grace period, protocol version 1) and the Angular lobby, game lobby and table screens. Dependencies added: `socket.io`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io-client`. See [docs/migration.md](docs/migration.md).

The UI foundation (spec 003) is in place: PrimeNG 22 with a custom Terracotta theme, light/dark mode and all screens migrated.

## Development

Requires Node 24 (`nvm use`, see `.nvmrc`) and npm >= 11. Copy `.env.example` to `.env` and set `PRIMENG_LICENSE`; the backend serves it to the SPA at runtime via `GET /api/config`. Run `npm run dev`.
