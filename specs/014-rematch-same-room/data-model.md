# Data Model: Rematch in the Same Room

## Room (backend, extended)

| Field     | Type                 | Meaning                                                                                                  |
| --------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| `round`   | integer, starts at 1 | The number of the current or last played game in this room; each rematch adds 1                          |
| `archive` | snapshot or none     | Set by a rematch: `{ round, game, seats, log, logBase, hostId }` of the finished game, read-only         |
| `dropped` | set of player ids    | Players whose reservation was dropped by the start; they still see the snapshot with `rematch: 'closed'` |

`phase` stays `lobby | running | finished`. A rematch moves `finished` to `lobby`; no other transition is added.

## Seat (backend and view, extended)

New state `reserved`: `{ state: 'reserved', playerId, nickname, language }`. Not human (no ready flag, no timers, no connection state), not computer, not open.

| At                   | Seat before               | Seat after                                 |
| -------------------- | ------------------------- | ------------------------------------------ |
| rematch              | host (human)              | human, not ready                           |
| rematch              | other human               | `reserved` for that player                 |
| rematch              | computer without `former` | unchanged                                  |
| rematch              | computer with `former`    | `open`                                     |
| rematch              | open, locked              | unchanged                                  |
| `rematch:join`       | `reserved` for the player | human, not ready (other ready marks reset) |
| `game:leave`, reload | `reserved` for the player | `open`                                     |
| `seat:remove` (host) | `reserved`                | `open`, player banned from this game       |
| `game:start`         | `reserved`                | `open`; player added to `dropped`          |

Counting rules: `reserved` counts as a used seat in the games list (`seatsUsed`) and is not joinable; it does not count for the two-player minimum and does not block the ready check; its nickname is in the set of taken names.

## Views

| Receiver                           | Phase in view | `round`         | `rematch`  | Content                                                   |
| ---------------------------------- | ------------- | --------------- | ---------- | --------------------------------------------------------- |
| anyone in a finished room (as now) | `finished`    | `room.round`    | none       | finished table; guest buttons: Rejoin disabled            |
| seated human in a lobby or running | as now        | `room.round`    | none       | as now                                                    |
| reserved player                    | `finished`    | `archive.round` | `'open'`   | snapshot of the finished game; Rejoin active              |
| dropped player                     | `finished`    | `archive.round` | `'closed'` | snapshot of the finished game; Rejoin disabled, only Back |

`you.seat` in a snapshot view is the player's seat in the finished game, so the ranking highlight and the winner check work unchanged. `you.reserved` is set to the reserved seat index for reserved players.

## Log

New kind `rematch` (host started a rematch). The log of the finished game is cleared at the rematch (`logBase` advances by its length) so the next game starts with a clean log; the snapshot keeps the old one for waiting players.

## Session (backend, existing)

`session.gameId` stays set for reserved and dropped players until they leave, reload or the room closes; a reload releases them (no game in the `session:start` ack).
