# Data Model: Leaner Socket Messages

Types live in `libs/game-rules/src/lib/protocol.ts` (shared). Persistence is unchanged.

## GameView (the snapshot)

Existing type, with these changes:

| Field           | Change                                                                                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `n: number`     | **New.** Running number of the last change this snapshot contains, for this recipient.                                                                                                                                                          |
| `game.rules`    | **Removed** from `GameStateView` (`Omit<GameState, 'deck' \| 'rules'>`); use `view.rules`.                                                                                                                                                      |
| everything else | Unchanged: `id`, `name`, `phase`, `rules`, `hostId`, `you`, `round`, `rematch`, `seats`, `game`, `preview`, `turnDeadline`, `fastComputerDice`, `computerSpeed`, `showBustProbability`, `spectating`, `spectators`, `paused`, `logBase`, `log`. |

## GameChange (one `game:change` payload)

All parts except `n` are optional; a part is present only if its value differs from the recipient's last sent view.

| Part           | Type                                                                            | Replaces in the view                                                  |
| -------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `n`            | `number`                                                                        | Required. Must be `lastN + 1`.                                        |
| `you`          | `GameView['you']`                                                               | `you` (small: player id, seat, warning flags)                         |
| `hostId`       | `string`                                                                        | `hostId`                                                              |
| `phase`        | `RoomPhase`                                                                     | `phase`                                                               |
| `rematch`      | `'open' \| 'closed' \| null`                                                    | `rematch` (`null` = cleared)                                          |
| `seats`        | `[index: number, seat: SeatView][]`                                             | Those entries of `seats`; the others stay                             |
| `game`         | `GameStateView \| null`                                                         | `game` (whole; `null` = none)                                         |
| `preview`      | `number[]`                                                                      | `preview`                                                             |
| `turnDeadline` | `{ at; phase } \| null`                                                         | `turnDeadline` (`null` = cleared)                                     |
| `settings`     | `Partial<{ fastComputerDice; computerSpeed; showBustProbability; spectating }>` | Those fields                                                          |
| `spectators`   | `number`                                                                        | `spectators`                                                          |
| `paused`       | `boolean`                                                                       | `paused`                                                              |
| `log`          | `LogEntry[]`                                                                    | Appended to `log`; the client trims to `LOG_CAP` and raises `logBase` |

Never part of a change (snapshot only): `id`, `name`, `rules`, `round`, `logBase` (derived), the full `log`.

## Server cache (per room)

`Map<playerId, { view: GameView-without-log, logEnd: number, n: number }>`

- `view`: the last view sent to this recipient (snapshot or applied change), used as `prev` for `diffView`. The log is not kept, only `logEnd = logBase + log.length`.
- `n`: the recipient's counter.
- Created or reset by `snapshot(room, playerId)` (acks and `game:snapshot`).
- Removed when the recipient leaves, stops watching, or the room is disposed. A recipient without an entry gets no pushes (they get their snapshot through the ack of the request that adds them).

State transitions of one recipient:

```text
no entry --(ack with snapshot)--> synced(n)
synced(n) --(diff = null)--------> synced(n)            nothing sent
synced(n) --(diff = change)------> synced(n+1)          game:change { n+1, ... }
synced(n) --(diff = structural)--> synced(n')           game:snapshot { n' = n+1, ... }
any --(leave / evicted / room gone)--> no entry
```

## Client state (SocketService)

- `game: Signal<GameView | null>` (unchanged), plus private `lastN` and `syncing` flag.
- `applyChange(view, change)` produces the next `GameView`; it never mutates the previous one.
- Rules: `n <= lastN` → ignore; `n === lastN + 1` → apply, `lastN = n`; otherwise → `game:sync` (drop changes while pending).

## Measurement report

`socket-traffic.json` (written by the script, summarised in `docs/socket-traffic.md`):

```text
scenario:  { players: 2 | 8, spectators: 0 | 2, seed }
rows:      { event, role: 'player' | 'spectator', count, bytesTotal, bytesAvg, bytesMax }
series:    bytes of the message of each action in order (shows growth over the game)
totals:    bytes per player, bytes per spectator
```
