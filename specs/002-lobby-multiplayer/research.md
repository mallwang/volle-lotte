# Research: Lobby and multiplayer

Every item below was an open question in the spec or constitution. No `NEEDS CLARIFICATION` remains.

## Transport

- **Decision**: everything over Socket.IO (lobby list, create, join, seat changes, turn actions). Each client request is an event with an acknowledgement `{ ok: true, ... } | { ok: false, reason }`. The server pushes `lobby:games`, `game:state` and `game:log`. No REST endpoints in this feature.
- **Rationale**: one channel, one auth path (token on the handshake), and rate limiting and validation in one place. Constitution VII: no second API surface.
- **Alternatives**: REST for create/join plus sockets for play (two auth paths, more code); plain `ws` (loses rooms, acks, reconnect).

## Dependencies

- **Decision**: add `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` (backend) and `socket.io-client` (frontend, also used by backend tests).
- **Rationale**: fixed by the constitution (Socket.IO via `@nestjs/websockets`).
- **Alternatives**: none; hashing and throttling deliberately add no packages.

## Password hashing

- **Decision**: `node:crypto` `scrypt` with a random 16-byte salt per game, stored as `salt:hash` (base64), verified with `timingSafeEqual`.
- **Rationale**: built in, memory-hard, enough for lobby passwords; no dependency.
- **Alternatives**: argon2/bcrypt packages (native builds, extra dependency for no requirement).

## Rate limiting (FR-007, SC-006)

- **Decision**: in-memory map keyed by `clientKey + gameId` holding failure timestamps. 5 failures within 10 minutes lock that key for 10 minutes; the ack returns `wrongPassword` with `attemptsLeft`, or `locked` with `retryAfterMs`. A correct password clears the key. `clientKey` is the first `x-forwarded-for` hop, else the socket address, because a token is free to mint and cannot identify a client.
- **Rationale**: values tuned in the plan as the spec allows; per-IP behind the reverse proxy needs the proxy to set the header (noted for the Docker feature).
- **Alternatives**: `@nestjs/throttler` (HTTP oriented, per-route, not per-game); per-token (bypassed by new tokens).

## Sessions and tokens (FR-001, FR-023)

- **Decision**: `session:start { nickname, token? }`. Without a token the server mints 32 random bytes (hex) and stores token to player `{ id, nickname }`. With a known token the session resumes and the nickname is kept. One live socket per token: a new connection with the same token disconnects the old one (it receives `session:replaced`). Nicknames are unique per game, case-insensitive, 2-20 characters of letters, digits, space, `_` and `-`; globally unique nicknames are not required (spec).
- **Rationale**: matches the spec; the token is the only credential and is never echoed to others.
- **Alternatives**: cookies (CORS and cross-origin complexity), signed JWTs (no accounts to sign for).

## Where game state lives

- **Decision**: one `GameRoom` object per game in a `Map` inside `GameRegistryService`; the engine `GameState` (immutable) is replaced on each action. Room fields: seats, host, ready flags, rules, password hash, log, timers.
- **Rationale**: the simplest structure satisfying spec scope; engine state already serializes via `toJSON`, so save/load can persist a room later.
- **Alternatives**: a Nest provider per game (over-engineered), RxJS subjects (no need).

## Hidden information (FR-016)

- **Decision**: `view.ts` projects a room to `GameView`: the engine state without `deck` (replaced by `deckSize`), seats with `kind` and, for computers, `difficulty` shown as `random` whenever the host picked random (for everyone, including the host). The real level stays server-side. Tokens, hashes and client keys are never part of a view.
- **Rationale**: one place decides what leaves the server.

## Timers

- **Decision**: plain `setTimeout`, owned by the room and cleared on dispose.
  - Reconnect grace: 60 s per disconnected human. After it, the room enters `awaitingHost` for that seat; if it is that player's turn the turn is paused (no actions accepted, computers do not act) until the host decides.
  - Cleanup: when the last connected human leaves, start 15 min (lobby) or 24 h (running); cancelled by any (re)connect; on expiry the room is removed from the registry.
  - Computer pacing: 700-1400 ms before each computer action (random within the range, not security relevant, `Math.random`).
- **Rationale**: no scheduler dependency; Jest fake timers make them testable.
- **Alternatives**: `@nestjs/schedule` (cron oriented, new dependency).

## Computer strategy (FR-025, FR-026)

- **Decision**: pure `chooseAction(state, difficulty, rng): Action` in `libs/game-rules/src/lib/computer.ts`. It enumerates `legalActions(state)` and decides by phase:
  - `draw`/`throw`: take that action.
  - `select`: choose the legal selection that keeps the most free dice (take the fewest points that still score) for easy and medium; for hard also take all scoring dice when that gives a Volle Lotte, otherwise the highest points per die used. Star and Street follow the legal set.
  - `decide`: bank when `turn points >= threshold`, otherwise throw. Thresholds by free dice: easy bank at 300 with any dice left, medium 450 (never with >= 5 free), hard 650 (never with >= 4 free); the initial numbers are tunable constants and calibrated later by simulation.
  - Always falls back to a legal action, so a computer can never act illegally.
  - `random` picks easy/medium/hard once when assigned.
- **Rationale**: pure and testable with seeded rngs (constitution II), reusable for the later simulation, and the backend only calls `chooseAction` then `applyAction`, so computers go through the same validation as humans (FR-025).
- **Alternatives**: strategy classes with an interface (one function per level is enough), a backend-only module (not reusable for simulation).

## Event log (FR-024)

- **Decision**: per-room array of `{ at, kind, text-free payload }` entries (kinds: joined, left, disconnected, reconnected, hostChanged, seatChanged, started, turn events from the engine `Event` list, finished). The client renders text from the kind; capped at 500 entries (oldest dropped). Sent as part of `game:state` on join and as `game:log` appends afterwards.
- **Rationale**: language stays in the frontend; no free text from the server.

## Frontend state

- **Decision**: one `SocketService` with Angular signals (`session`, `games`, `game`, `connection`); components read signals and call methods that return the ack. Token in `localStorage` under one key; on reconnect the service replays `session:start` and `game:resume`.
- **Rationale**: no state library needed (VII).

## Protocol version

- **Decision**: `PROTOCOL_VERSION = 1` exported from `libs/game-rules` and returned in the `session:start` ack and `welcome` event; the PWA feature uses it later. A client that sends a different `protocolVersion` in `session:start` gets `versionMismatch`.
