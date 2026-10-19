# Data Model: Game-Over Modal

No new persisted or transmitted fields. This feature changes how existing data is used.

## Seat (backend, existing)

| Phase    | Event for a human seat                    | Before                 | After                                                                             |
| -------- | ----------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| lobby    | leave / grace over                        | `open`                 | `open` (unchanged)                                                                |
| running  | leave / timeouts / grace over             | computer with `former` | computer with `former` (unchanged)                                                |
| finished | leave, reload release, or connection lost | `open` (indices shift) | computer seat: `name` = former nickname, `former` set, difficulty/risk irrelevant |

Rules for the finished case:

- Engine player index, name and score never change; the seat list keeps its length and order.
- `humans()` no longer contains the player, so `closeIfEmpty` removes the room after the last human left.
- The host is re-elected among the remaining humans; if none remain the room is closed anyway.
- A `left` log entry is added once; no `disconnected` entry is written for a connection lost in a finished room.
- `rejoinable` stays false (needs a running game).

## Session (backend, existing)

`session.gameId` is cleared when the player is released; the socket joins the lobby room as for any seatless session.

## Game result (existing)

`Result { reason: 'targetScore' | 'clover', winner: engine index, ranking: Rank[] }`; `Rank { rank, players: engine indices }`. Engine index to seat: `playerSeats(view)[index]`.

## Modal state (frontend, derived)

```text
visible = view.phase === 'finished'
          && view.you.seat >= 0
          && !roll.rolling() && !notice()
          && revealed >= logEnd(view)

won     = playerSeats(view)[view.game.result.winner] === view.you.seat
```

| State                                          | Modal | Celebration                                 |
| ---------------------------------------------- | ----- | ------------------------------------------- |
| running                                        | no    | no                                          |
| finished, last roll or notice pending          | no    | no                                          |
| finished, visible, `won`, motion allowed       | yes   | started on show, stopped on hide or destroy |
| finished, visible, not `won` or reduced motion | yes   | no                                          |

## Celebration (frontend service)

`running: boolean` (internal), an interval handle, and the lazily loaded library. `start()` is idempotent; `stop()` is idempotent and also runs when the table is destroyed.
