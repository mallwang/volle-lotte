# Research: Leaner Socket Messages

Findings from reading the current code (`view.ts`, `lobby.gateway.ts`, `game-room.ts`, `socket.service.ts`, `table.ts`).

## Current behaviour

- `GameRoom.emit()` and the other mutators call `onChange(entries)` (25+ call sites). The gateway's `push()` then sends every watcher `game:state { game: toView(room, id) }` and players additionally `game:log { entries }`.
- `toView` contains the whole `log` (up to `LOG_CAP` = 500), all seats, rules, name, host settings and `game` (which again contains `rules` and all player names).
- The frontend never listens to `game:log`; it reads `game().log` from the state. The table keeps its own cursor over the log (`seen`, `logBase` in `table.ts`), so appending entries in place is compatible with it.
- Spectators get no `game:log`; they only get the log through the state.
- `turn:preview` (every tick of a die) goes through `setPreview` and `onChange([])`, so it sends a complete state to everybody.
- All entering flows already return a `GameView` in the ack (`session:start`, `game:join`, `game:spectate`, `game:rejoin`, `rematch:join`). On reconnect the client replays `session:start` / rejoin, so it gets a snapshot via the ack already.
- Views differ per recipient: `you` (seat, `timeoutWarning`, `reserved`, `spectator`) and the waiting view (`waitingView`: archive of the finished game, `rematch` open/closed).

## Decisions

### D1. Snapshot = existing `GameView` plus `n`

- **Decision**: Keep `GameView` as the snapshot type, add the running number `n`. `game:state` is removed. Acks stay the main way to deliver snapshots. Add a `game:snapshot` push for cases where the server must replace a client's whole view without a request.
- **Rationale**: The acks already carry a complete view; the client already handles it. Smallest change on the entering paths.
- **Alternatives**: A separate "snapshot" type (more types, no gain); keeping `game:state` as snapshot event (name suggests frequent use and keeps two ways to do the same).

### D2. Deltas built by comparing views, not by changing the room

- **Decision**: Keep the recipient's last sent view on the server. `diffView(prev, next)` compares hand-written field groups and returns a `GameChange` (or `null` if nothing differs, or "structural" if a change cannot be expressed). `applyChange(view, change)` applies it on the client.
- **Rationale**: The room has 25+ mutation points, all funnelling into `onChange`. Hooking in at the one place (`push`) guarantees that no mutation is forgotten, keeps the room and the rules engine untouched, and makes the correctness a single property: `apply(prev, diff(prev, next)) = next`, which is easy to test exhaustively (also with generated views).
- **Alternatives**: Named events emitted by each room method (precise, but 25+ edits, easy to miss one; a forgotten one silently shows a wrong table); a generic JSON patch (RFC 6902; heavier, less readable, rejected in the roadmap).

### D3. Field groups of a change

- **Decision**: `GameChange` has the optional parts `you`, `hostId`, `phase`, `seats` (list of `[index, SeatView]`), `game` (the whole engine state view, which is small without `rules`), `preview`, `turnDeadline`, `settings` (fast dice, speed, bust odds, spectating), `spectators`, `paused`, `rematch`, `log` (entries to append). See `contracts/protocol.md`.
- **Rationale**: These are the groups of `GameView`; each can be compared with a plain deep-equal of a small value. The `game` part is replaced as a whole (about 300-400 bytes with 8 players); finer patches can be added after measuring if worthwhile.
- **Alternatives**: Sub-deltas for scores and turn (smaller, more code and tests; postponed until the re-measurement shows they matter).

### D4. Structural changes send a snapshot

- **Decision**: If `round` changes, the recipient switches between the normal and the waiting view, the log would shrink or jump (rematch start), or `rules`/`name` change, `diffView` reports "structural" and the gateway sends `game:snapshot` instead of a change.
- **Rationale**: These happen once per game (or never); a snapshot is the correct and simplest answer. This also guarantees FR-012 (rematch gives everybody, including spectators, a complete snapshot).
- **Alternatives**: Expressing them as changes (more code for rare events).

### D5. Static values leave the game part

- **Decision**: `GameStateView` drops `rules` (they are in `GameView.rules` already). The client reads `view.rules`.
- **Rationale**: Today the rules (11 card counts) are sent twice in every state and would be repeated in each `game` part.
- **Alternatives**: Keep it (about 200 wasted bytes per turn message).

### D6. Running number per recipient

- **Decision**: The server keeps `n` per recipient together with the last sent view. A snapshot (ack or push) sets `n` to the recipient's current counter; each `game:change` sends `n + 1`. A recipient with no message to send gets no message and the counter does not move.
- **Rationale**: A gap then means exactly "this connection lost something". A room-wide counter would show false gaps (see Complexity Tracking in the plan).
- **Alternatives**: Room-wide counter with empty heartbeat messages (wastes bytes); content hashes (cannot tell how many were missed, cannot order).

### D7. Recovery is a pull by the affected client

- **Decision**: New intent `game:sync` (ack returns the snapshot). The client sends it when `n` is not `lastN + 1`; it also drops changes with `n <= lastN`. The server rate-limits `game:sync` per session (at most 5 per 10 seconds) and answers `notInGame` / `gameNotFound` like `game:rejoin`.
- **Rationale**: Only the affected client pays; no pause for others. The server cannot know that a client missed something, the client can.
- **Alternatives**: A server-wide sync pause (disturbs everybody for one client's problem; the server cannot detect the loss); a resend buffer (more state, still needs a fallback).

### D8. Ordering during a pending sync

- **Decision**: While a `game:sync` is pending, the client drops incoming changes. If a change newer than the snapshot is dropped, the next change shows a gap and a new sync follows. The loop ends because the rate of changes is low (seconds) compared to a round trip.
- **Rationale**: Simple and always correct; buffering would be an optimisation for a rare case.
- **Alternatives**: Buffering and replaying changes after the snapshot (more code, more states to test).

### D9. Log

- **Decision**: The log is part of the snapshot. Changes carry only new entries (`log`). The client appends and trims to `LOG_CAP`, increasing `logBase` like the server. The server derives the new entries from `logBase + log.length` of the previous and the new view, so spectators get the same (they got none before) and the `entries` argument of `onChange` is no longer needed for sending.
- **Rationale**: One source of truth, no double delivery (FR-005). `game:log` is removed from the protocol (no client uses it).
- **Alternatives**: Keep `game:log` for players (a second path to keep consistent).

### D10. Measurement

- **Decision**: `apps/backend/scripts/measure-socket.ts`, started with `npm run measure:socket`, boots the lobby module in process (like `testing/client.ts`), connects real Socket.IO clients and plays full games: one scripted human player (select scoring dice, bank at a threshold) against computers, plus spectators and passive players. It counts the encoded size of every packet per event name and client role (`socket.onAny` with the serialised payload length plus event name; this equals the Socket.IO text frame body) and prints a table and a JSON file. 2 players and 8 players, each with and without 2 spectators, fixed random seed.
- **Rationale**: Repeatable, no browser needed, reusable for later changes (the spec asks for it).
- **Alternatives**: Counting in the server log (not repeatable); browser dev tools (manual); engine-level wire bytes (adds the framing of a few bytes per packet and compression-dependent numbers; not needed to compare before and after).

### D11. Not in this feature

- **Decision**: No compression, no MessagePack, no generic patches (spec FR-017). `PROTOCOL_VERSION` becomes 12. `docs/socket-traffic.md` records the numbers and, for each of the three options, drop / postpone / plan.
- **Rationale**: The user wants to see the effect of the structural change first.

## Open points resolved

- _Waiting player_: the rematch decision becomes `game:change { rematch }`; a reload there takes the snapshot path (`waitingView` stays as snapshot builder). No separate message type is needed.
- _Lobby phase_: the same mechanism covers the lobby (seat changes, ready flags, settings), because it works on `GameView`, not on game phases. Ready toggles and seat edits are `seats` parts.
- _Hot path cost_: `toView` is already computed once per recipient per change; `diffView` adds a few deep-equals of small values. The log is compared by length only (it is append-only between structural changes).
