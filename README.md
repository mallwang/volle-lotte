# Volle Lotte

Online multiplayer web app (PWA) for the dice game _Volle Lotte_ (Tutto), 2-8 players, computer opponents.
Hosting: https://volle-lotte.allwang.family. A single Docker container (NestJS serves API, WebSocket and the Angular build), SQLite on a volume.

Ported from the Java Swing version (`java/apps/games/volle-lotte`). Game rules: [docs/rules.md](docs/rules.md).
Developed with [Spec-Kit](https://github.com/github/spec-kit) (`/speckit-*`); principles in `.specify/memory/constitution.md`.

## Status

Workspace, CI (lint, typecheck, test, build, SonarCloud), the constitution and the pure rules engine (`libs/game-rules`, spec 001) are in place; lobby and multiplayer (spec 002) is specified and next to be planned. See [docs/migration.md](docs/migration.md).
