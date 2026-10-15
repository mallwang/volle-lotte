# Data model: Lobby and multiplayer

All in memory, owned by the backend. Types marked _wire_ are shared via `libs/game-rules/src/lib/protocol.ts`. Engine types (`GameState`, `Rules`, `Action`, `Event`, `Result`) come from `libs/game-rules`.

## Session

| Field      | Type   | Notes                                          |
| ---------- | ------ | ---------------------------------------------- |
| `token`    | string | 32 random bytes hex; secret, never broadcast   |
| `playerId` | string | public id (random, 8 bytes hex), used in views |
| `nickname` | string | 2-20 chars, `[A-Za-z0-9 _-]`, trimmed          |
| `socketId` | string | undefined                                      | the single active connection (FR-023) |
| `gameId`   | string | undefined                                      | game the player currently sits in     |

Relationships: one session sits in at most one game. Removed with its game's last reference or when never used again (swept with the cleanup timers; sessions without a game and without a connection expire after 24 h).

## GameRoom (server only)

| Field          | Type                                 | Notes                                                                                          |
| -------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `id`           | string                               | random, public                                                                                 |
| `name`         | string                               | 1-40 chars                                                                                     |
| `passwordHash` | string                               | `salt:hash` (scrypt); never in views or logs                                                   |
| `rules`        | `Rules`                              | validated with `rulesError`; fixed after creation (FR-008)                                     |
| `seats`        | `Seat[]` (length 8)                  | index = seat number                                                                            |
| `hostId`       | string                               | playerId of the host (FR-022 moves it)                                                         |
| `phase`        | `'lobby' \| 'running' \| 'finished'` |                                                                                                |
| `game`         | `GameState \| null`                  | engine state, set at start; seat index = engine player index among the occupied seats at start |
| `log`          | `LogEntry[]`                         | capped at 500                                                                                  |
| `pending`      | `playerId[]`                         | seats waiting for a host decision (FR-021)                                                     |
| `timers`       | internal                             | grace, cleanup, computer pacing                                                                |
| `createdAt`    | number                               | ms                                                                                             |

## Seat

`state` is one of:

- `open`: free, can be taken by a join (or filled by the host with a computer)
- `locked`: not usable (padlock); beyond the chosen count at creation (FR-010)
- `human`: `{ playerId, connected, ready, disconnectedAt? }`
- `computer`: `{ difficulty: 'easy'|'medium'|'hard'|'random', effective: 'easy'|'medium'|'hard' }`; `effective` is server-only

Rules:

- Occupied seats cannot be locked (host must free them first; locking is refused with `seatOccupied`).
- Switching a human seat to computer is an `awaitingHost` decision or a lobby action (lobby: the human is removed from the game).
- A computer taking over a running seat keeps the existing engine score (the engine player is unchanged, only the controller changes).
- Start requires >= 2 occupied seats and every `human.ready` (FR-013). Readiness resets when the seat set changes.

## LogEntry (_wire_)

`{ at: number, kind: LogKind, seat?: number, data?: Event | number | string }` with `LogKind` = `joined | left | disconnected | reconnected | hostChanged | seatChanged | started | turn | finished | waitingForHost | hostDecided`. `data` carries an engine `Event` for `turn` and the new difficulty or seat state for `seatChanged`. No free text.

## GameView (_wire_, what a client receives)

| Field         | Type                                       | Notes                                                                                                  |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `id`, `name`  | string                                     |                                                                                                        |
| `phase`       | `'lobby' \| 'running' \| 'finished'`       |                                                                                                        |
| `rules`       | `Rules`                                    |                                                                                                        |
| `hostId`      | string                                     |                                                                                                        |
| `you`         | `{ playerId, seat }`                       | the receiver                                                                                           |
| `seats`       | `SeatView[]`                               | `{ state, playerId?, nickname?, connected?, ready?, difficulty? }`; difficulty `random` stays `random` |
| `game`        | engine state minus `deck`, plus `deckSize` | present when running or finished                                                                       |
| `pending`     | seat numbers                               | waiting for host decision; clients show banner and countdown                                           |
| `graceEndsAt` | `Record<seat, number>`                     | for the 60 s countdown (server time, ms)                                                               |
| `log`         | `LogEntry[]`                               | full on join, appended via `game:log`                                                                  |

## GameSummary (_wire_, main lobby list)

`{ id, name, host: nickname, targetScore, seatsUsed, seatsTotal, locked: true, phase }`. Only `phase: 'lobby'` games are listed as joinable; running games are listed as `running` and cannot be joined (spec: late join is out of scope).

## State transitions

```text
GameRoom.phase:   lobby --start--> running --gameOver--> finished
                    \--no connected human for 15 min--> deleted
                  running --no connected human for 24 h--> deleted
                  finished --everyone leaves--> deleted

Human seat:       open -> human(connected) -> human(disconnected, grace 60 s)
                  disconnected --reconnect--> connected
                  disconnected --grace over / leave--> pending (host decides)
                  pending --host: computer--> computer | --host: free--> open
```

## Validation summary

- nickname: see Session; name: 1-40; password: 4-64 chars; seats: integer 2-8; rules: `rulesError(rules) === null`.
- every payload is checked structurally in the gateway before it reaches a room; invalid payloads get `invalidRequest`.
