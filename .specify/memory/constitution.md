# Volle Lotte Constitution

## Core Principles

### I. Server-Authoritative Game State

The server owns all game state and every random outcome. Dice throws and card draws MUST use
`crypto.randomInt` on the server; clients only send intents (select dice, bank, throw) and render
the state they receive. The dice animation on the client is presentation only. The server MUST
validate every intent against the rules and the current turn and reject anything else.

Rationale: online play with up to 8 players is only fair if no client can influence dice, deck or
scores.

### II. Pure, Tested Rules Engine

All game rules (scoring, bust check, turn flow, cards, target score, turn order) live in
`libs/game-rules` as pure TypeScript functions with no I/O, no framework imports and no hidden
randomness (the random source is injected). [docs/rules.md](../../docs/rules.md) is the source of
truth and takes precedence over the Java reference. Every rule MUST have unit tests; the Java
tests are ported first, then extended for the new rules. The engine is used by the backend and
MAY be used by the frontend for display hints, never for decisions.

Rationale: the rules are the core value of the product; a pure engine is cheap to test
exhaustively and to reuse for computer players and simulations.

### III. Test Coverage

New logic ships with tests in the same change. The target is 80% coverage per project, with
`libs/game-rules` as the highest-value area (aim for near-complete). Pure bootstrap/config files
and template-only components may be skipped, and the skip list MUST be mirrored in
`sonar.coverage.exclusions` (see `.specify/memory/test-coverage-guide.md`). Bug fixes start with
a failing test.

### IV. One Container, SQLite, Survivable Games

The app is deployed as a single Docker container: NestJS serves the API (`/api`), the WebSocket
(`/socket.io`) and the built Angular app, with SQLite on a volume (`/data`). The game state MUST be
persisted after every turn so that restarts and updates never lose a running game. Loading a
persisted game returns to the game lobby, and all humans confirm "Ready" again. The backend
reports a `protocolVersion`; the PWA activates an update only in the lobby or after a game,
never mid-game.

### V. Anonymous Play, Optional Lobby Passwords

Release 1 has no accounts. Players are identified by a nickname plus a server-issued token. A game
MAY be created with a password (stored hashed, join attempts rate-limited); a game without a
password is open and joinable by anyone in the lobby phase. Rejoining a seat uses the anonymous
session only (no account, no code). Secrets and tokens MUST
NOT be logged or committed (secretlint runs on commit and in CI). Accounts and e-mail features are
out of scope until a dedicated spec adds them.

### VI. UX First

Volle Lotte is a game; the experience is a feature. Interfaces MUST work on touch and mouse, on
phones and desktops, and as an installable PWA. Core interactions (tap a die to secure it, throw,
bank) MUST be achievable in few steps and without reading instructions. UI changes are reviewed
with `/speckit-ux-review`. Basic accessibility applies: keyboard operability, visible focus,
sufficient contrast, no information conveyed by color alone.

### VII. Simplicity

Start with the simplest design that satisfies the spec (YAGNI). No new dependency, abstraction,
service or configuration option without a concrete requirement. Configurable rules are limited to
those listed in rules.md; the core rules (e.g. 1/5 scoring) are fixed. Deviations MUST be
justified in the plan's Complexity Tracking section.

## Technology & Architecture Constraints

- Nx monorepo with npm workspaces (npm >= 11): `apps/frontend` (Angular), `apps/backend`
  (NestJS), `libs/game-rules` (shared). Everything runs through Nx.
- Module boundaries are enforced via `scope:frontend|backend|shared` tags; the frontend MUST NOT
  import backend code and vice versa, only `scope:shared` libs.
- Realtime via Socket.IO (`@nestjs/websockets`); persistence in SQLite.
- Everything user-facing and all documentation, code comments, commits and PRs are in English
  (see CLAUDE.md).

## Development Workflow & Quality Gates

- Work is specified with `/speckit-specify`, planned with `/speckit-plan` and broken down with
  `/speckit-tasks` before implementation.
- Changes land via small branches and pull requests; `main` is protected and PRs are merged by
  the maintainer.
- Commits follow Conventional Commits. Pre-commit (secretlint, eslint, prettier) and pre-push
  (affected typecheck and tests) hooks MUST NOT be bypassed.
- CI (lint, format, typecheck, test, build, SonarCloud quality gate) MUST be green before merge.
- Any deviation from a principle MUST be documented in the PR description; recurring deviations
  trigger a constitution amendment instead of silent exceptions.

## Governance

This constitution supersedes other project practices where they conflict. Amendments are made via
`/speckit-constitution` and apply semantic versioning (MAJOR for removing or redefining a
principle, MINOR for a new principle or materially expanded guidance, PATCH for clarifications)
and update the `Last Amended` date.

All plans MUST include a Constitution Check against the Core Principles; unresolved violations
MUST be justified in Complexity Tracking or the plan MUST be revised. Reviewers treat this
constitution as authoritative. Runtime guidance for agents lives in [CLAUDE.md](../../CLAUDE.md).

**Version**: 1.1.0 | **Ratified**: 2026-10-15 | **Last Amended**: 2026-10-16
