# Volle Lotte

> Dieses README gibt es auch auf Deutsch: [README.de.md](README.de.md)

Online multiplayer web app (PWA) for the dice game _Volle Lotte_ (Tutto), 2-8 players, computer opponents.
Hosting: https://volle-lotte.allwang.family. A single Docker container (NestJS serves API, WebSocket and the Angular build), SQLite on a volume.

Ported from the Java Swing version (`java/apps/games/volle-lotte`). How to play: [docs/how-to-play.md](docs/how-to-play.md). Technical rule reference: [docs/rules.md](docs/rules.md).
Developed with [Spec-Kit](https://github.com/github/spec-kit) (`/speckit-*`); principles in `.specify/memory/constitution.md`.

Features: English and German UI (follows the browser language, switchable in the header). How to play: [English](docs/how-to-play.md) | [Deutsch](docs/how-to-play.de.md). User guide: [English](docs/user-guide.md) | [Deutsch](docs/user-guide.de.md).

## Status

Workspace, CI (lint, typecheck, test, build, SonarCloud), the constitution and the pure rules engine (`libs/game-rules`, spec 001) are in place; lobby and multiplayer (spec 002) is implemented: a NestJS Socket.IO gateway (optionally password-protected games, 2-8 seats, computer players, reconnect with a 60 s grace period, protocol version 4: open games, host remove-and-ban, bot replacement with rejoin, per-phase turn timers) and the Angular lobby, game lobby and table screens. Dependencies added: `socket.io`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io-client`. See [docs/migration.md](docs/migration.md).

The UI foundation (spec 003) is in place: PrimeNG 22 with a custom Terracotta theme, light/dark mode and all screens migrated.

## Development

Requires Node 24 (`nvm use`, see `.nvmrc`) and npm >= 11. Copy `.env.example` to `.env` and set `PRIMENG_LICENSE`; the backend serves it to the SPA at runtime via `GET /api/config`. Run `npm run dev`.

## Running with Docker

One image contains everything: NestJS serves the API (`/api`), WebSocket (`/socket.io`) and the Angular build on port 3000. Build and try it locally:

```bash
docker build -t volle-lotte .
docker run --rm -p 8080:3000 -v "$PWD/data:/data" -e PRIMENG_LICENSE=... volle-lotte
```

Then open http://localhost:8080. `GET /api/health` is the healthcheck.

## Deploying with Portainer (or any Docker Hub-based host)

[`docker-compose.portainer.yml`](docker-compose.portainer.yml) pulls the prebuilt image from Docker Hub instead of building it.

1. Get the image onto Docker Hub, either:

   - **Automatically**: pushing a `v*.*.*` tag (e.g. via `npm run release`) runs [`.github/workflows/release.yml`](.github/workflows/release.yml), which builds the `Dockerfile` and pushes `walefish/volle-lotte` as `:latest` and `:<tag>` (needs the `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` repo secrets).
   - **Manually** (add `--platform linux/amd64,linux/arm64` via `docker buildx build` if the host's CPU architecture differs from your dev machine's):

     ```bash
     docker login
     docker build -t <dockerhub-user>/volle-lotte:latest .
     docker push <dockerhub-user>/volle-lotte:latest
     ```

2. On the host, create the data directory. The container runs as the `node` user (uid 1000), so it must be writable by that user:

   ```bash
   mkdir -p /opt/volle-lotte/data && chown 1000:1000 /opt/volle-lotte/data
   ```

3. In Portainer: **Stacks → Add stack**, paste `docker-compose.portainer.yml` (or point it at this repo's git URL with that compose path). Under **Environment variables** set:

   | Variable          | Default    | Purpose                                                                            |
   | ----------------- | ---------- | ---------------------------------------------------------------------------------- |
   | `PRIMENG_LICENSE` | _(none)_   | [PrimeUI](https://primeng.dev/configuration#license) key, served via `/api/config` |
   | `DOCKERHUB_USER`  | `walefish` | only if you push to a different account                                            |
   | `TAG`             | `latest`   | image tag to deploy                                                                |
   | `PORT`            | `8080`     | host port                                                                          |

4. Deploy and put your reverse proxy (https://volle-lotte.allwang.family) in front of the host port. It **must allow WebSocket upgrades** for `/socket.io`.

Re-deploying after a new image: **Stacks → your stack → Pull and redeploy** (or `docker compose pull && docker compose up -d`). Back up the database by copying `/opt/volle-lotte/data`.
