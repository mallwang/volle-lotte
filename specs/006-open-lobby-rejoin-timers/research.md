# Research: Open Lobbies, Rejoin, Leave Warning and Turn Timers

No NEEDS CLARIFICATION remained after `/speckit-clarify`. Decisions below.

## Open games

- **Decision**: `game:create` accepts `password: ''` (empty = open); otherwise the existing 4–64 length rule applies. `passwordHash` becomes `''` for open rooms; `game:join` skips verification and the attempt limiter when the hash is empty. `GameSummary.locked: true` becomes `protected: boolean`.
- **Rationale**: smallest change to the existing flow; no second creation path.
- **Alternatives**: separate `visibility` field (redundant with the empty hash).

## Close seat and ban

- **Decision**: new intent `seat:remove {seat}` (host, lobby phase only): the human seat becomes `locked`, the player id goes into `room.banned` (a `Set<string>`), the removed player gets `game:closed {reason: 'removed'}` (existing push) and the client shows the modal. `join` and `rejoin` reject banned ids with `banned`. Voluntary leave in the lobby does not ban (FR-008).
- **Rationale**: reuses the existing `removed()` gateway helper and locked seat state; "Reopen" is already possible through `seat:set` open.
- **Alternatives**: ban by nickname (spoofable, breaks if renamed).

## Bot replacement and former player

- **Decision**: computer seat gets `former?: { playerId; nickname }`. Leave-in-running, grace expiry (30 s, `GRACE_MS` 60 000 → 30 000) and the third timeout all call one `replaceByBot(seat)`: random difficulty via the existing `levelFor('random')`, `former` set, `scheduleComputer()` runs through the existing `emit()`. If it is that seat's turn, the bot continues the pending action (phase is unchanged). The `pending` set, `decide`, `host:decide`, `waitingForHost`/`hostDecided` log kinds, `graceEndsAt` and the disconnect banner are removed.
- **Rationale**: net deletion; the bot path already exists for setup-time computers.
- **Alternatives**: keep the host dialog as optional (rejected by FR-012).

## Rejoin

- **Decision**: new intent `game:rejoin {gameId}`. The gateway takes `session.playerId` (the token session in the same browser) and the room checks that some seat is `computer` with `former.playerId === playerId` and the id is not banned; the seat turns back into a human seat (score and engine player untouched, nickname kept from `former`, `connected: true`, timeout counter reset), the computer timer is cleared, and a `rejoined` log entry is added. `session:start` with a token also takes the existing reconnect path; if the seat is already a bot, it simply lands in the list with Rejoin available. The lobby list marks games with `rejoinable: true` per requesting player via `lobby:list` (summaries are per player, the push to the `lobby` room is built per socket).
- **Rationale**: identity is the existing anonymous session; no code or account is introduced (Principle V).
- **Alternatives**: auto-rejoin on `session:start` (rejected: spec requires an explicit Rejoin button). Two tabs: `sessions.attach` already replaces the older socket.

## Per-player lobby summaries

- **Decision**: `lobby:list` and `lobby:games` become per-socket, because `rejoinable` depends on the player. `pushLobby()` iterates lobby sockets instead of one room broadcast; summaries stay cheap (≤ games count).
- **Alternatives**: client-side filter by sending former playerIds in every summary (leaks identities to everyone).

## Turn timers

- **Decision**: one timer per room (`turnTimer`), (re)armed from `emit()` when the state after an action implies a human is to act. Limits by `game.turn.phase`: `draw`, `throw` 10 s; `select` 15 s; `decide` 15 s. Start delay equals the animation wait already used for the computer (`ROLL_MAX_MS + AFTER_ROLL_MS` after a `thrown` event, otherwise 0), so `deadlineAt = now + startDelay + limit` and is sent in the view; the client shows the countdown only for `now >= animationEnd` using the same value. Expiry actions: draw → `draw`; throw → `throw`; select → `skipTurn` (new pure engine function: next player, no points, log `turnSkipped`); decide → `bank`. Each expiry increments `timeouts` on the seat; any own `act` resets it to 0. At 2 the view carries `timeoutWarning` (shown before the third); at 3 `replaceByBot`. The timer is cleared in `apply`, so a racing action and expiry apply exactly once. Not armed for computer seats; not paused while disconnected (FR-018b).
- **Rationale**: matches the existing computer pacing code; the server never needs to observe the client animation, same approach as 005 (fixed margin).
- **Alternatives**: client-reported "animation done" ack (untrusted, needs a timeout fallback anyway).

## Log and notifications

- **Decision**: new `LogKind`s `replaced` (bot took over; data = reason `left|disconnected|timeouts`), `rejoined`, `timedOut` (data = action name), `removed`. Removed `waitingForHost`, `hostDecided`. The client shows a toast on `rejoined` for all players (FR-014) and the seat badge comes from `seats[i].state`/`former`.
