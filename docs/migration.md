# Migration / handover: Java -> web app

Status: 2026-10-14. This file is the handover from the planning session (started in the `java` repo) into this repo.

## Goal

_Volle Lotte_ as a web app at https://volle-lotte.allwang.family. 2-8 players online (humans and computers), PWA.
Stack like Vaultfolio (`/home/z003f3jd/projects/github/vaultfolio`): Nx monorepo, NestJS, Angular, SQLite, npm.
**One** Docker container for Portainer (Vaultfolio has two).

## Java reference (read-only, change nothing)

Base: `tmp/java/` in this repo (git-ignored, copy of `/home/z003f3jd/projects/github/java/apps/games/volle-lotte/`). `tmp/java/modernized/` is the finished Java 21 version without `target/`, `tmp/java/legacy-src/` holds the original sources. The original repo does not need to be read.

| Java                                                                         | Purpose                              | Target in this repo                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| `tmp/java/modernized/src/main/java/vollelotte/Punkte.java`                   | scoring, bust check                  | `libs/game-rules`, pure TS functions                                |
| `.../Runde.java`                                                             | one turn (select, throw, bank, lost) | `libs/game-rules`                                                   |
| `.../Spiel.java`                                                             | players, scores, turn order          | `libs/game-rules`, extend (target score, 2-8 players, card effects) |
| `.../Kartenstapel.java`, `Karte.java`                                        | deck, card types, image names        | `libs/game-rules`, count per type configurable                      |
| `.../Spielbrett.java`, `VolleLotteApp.java`, `NeuesSpielDialog.java`         | Swing UI                             | do not port, only for reference (click a die = secure it)           |
| `tmp/java/modernized/src/test/java/vollelotte/{Punkte,Runde,Spiel}Test.java` | tests                                | port 1:1 to Vitest/Jest, then extend for the new rules              |
| `tmp/java/modernized/src/main/resources/img/*.png`                           | card images                          | copy in `docs/assets/legacy-cards/`                                 |
| `tmp/java/legacy-src/`                                                       | original sources                     | only for questions about original behaviour, not a porting target   |

The Java version is incomplete (only bonus cards work, no target score, a turn ends after banking).
The full rules are in [rules.md](rules.md) and take precedence over Java behaviour.
Java quirks that stay: 350 minimum points (configurable), four-of-a-kind doubling (configurable), deck is reshuffled when empty.

## Decisions

- New repo next to Vaultfolio, **not** connected to GitHub yet, no commits so far.
- No accounts in the first release: anonymous sessions. Nickname plus a server-issued token in `localStorage` (reconnect, host role). Lobby protected by a game password (hashed, rate-limited).
- The server is authoritative (dice, deck, points, `crypto.randomInt`). The dice animation on the client is show only.
- Realtime: Socket.IO via `@nestjs/websockets`.
- One container: NestJS serves the Angular build via `@nestjs/serve-static` (API under `/api`, WebSocket under `/socket.io`, SPA fallback). One multi-stage Dockerfile, one port, volume `/data` for SQLite, healthcheck. Do not cache `index.html` and `ngsw.json`, cache hashed assets for long. The reverse proxy must allow WebSocket upgrades.
- Persist the game state as JSON in SQLite after every turn (save/load, restart without losing games). Loading leads to the game lobby, all humans must press "Ready" again.
- PWA: Angular service worker, an update is only activated in the lobby or after the game, never mid-game. The backend reports a `protocolVersion`.
- Dice selection: tap. Drag-and-drop at most later.
- Star stays as its own card type (effect like Fireworks).
- The 350 minimum points stay, some rules are configurable, but the 1/5 scoring and other core rules are fixed (see rules.md).

## Requirements from the briefing (summary for later specs)

- Main lobby: the host picks the player count 2-8. Seats not chosen are locked in the game lobby (padlock); the host can enable/lock seats and switch between human/computer at any time (computer with a difficulty or "random", which stays hidden from the other players).
- Create a game with a password, joining only with the password. Rules are set at creation (target score, card set with default and count per type).
- Every human presses "Ready", only then can the host start.
- If someone leaves: warning to everyone, log entry, host decides (put in a computer or free the seat). Reconnect grace period before that decision (proposal 60 s).
- Dice: animation. Automatic (random duration 2-5 s) or manual (drag the cup via pointer events, mouse and touch). Maximum 20 s; a timer starts after 10 s, then the throw happens automatically. The server enforces the same limits.
- Computer players: strategy interface, levels by risk (when to stop, which dice to take), simulation for calibration. Artificial pauses during their turn.
- Save and load a game (server-side, host).
- Game log: participants, date/time, duration, final result (backend table), plus an event log per game.
- Look: original images in a hand-drawn style, dice and cup to match (SVG).
- Later (not release 1): accounts (logic from Vaultfolio: invitations, e-mail confirmation, forgot/change password, profile picture), SMTP, invitation by nickname with deep link.

## State of this repo

- Created: `git init` (main), Spec-Kit 0.16.2 (Claude, sh), `.editorconfig` and `.prettierrc` from Vaultfolio, `.gitignore`, README, CLAUDE.md, `docs/rules.md`, this file, card images.
- **Not** created: constitution, Nx workspace, code, Docker, CI.
- Vaultfolio reference: read its constitution (`.specify/memory/constitution.md`) and `CLAUDE.md` as a template for tooling rules, do not copy blindly (Vaultfolio-specific: encryption, Turnstile, PrimeNG, domains).

## Next steps

1. `/speckit-constitution` (proposal: server-authoritative, pure tested rules engine, one container with SQLite, games survive updates and restarts, no accounts in release 1, npm and Nx like Vaultfolio).
2. `/speckit-specify` feature 1: rules engine (input: rules.md, the Java tests). Then `/speckit-clarify` with the clarification questions from rules.md.
3. Nx workspace (NestJS, Angular, `libs/game-rules`) as the first task in the plan of feature 1 or as its own feature 0.
4. Further features in this order: lobby and multiplayer via WebSocket, computer players, dice UI, save/load, PWA and safe updates, game log, Docker deployment.

## Open decisions

See the clarification questions in rules.md. The most important: Star as part of the 5 Fireworks or additional, Street cumulative across throws, points on Stop after a Volle Lotte.
