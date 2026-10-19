# Contract: Rematch Protocol

`PROTOCOL_VERSION` goes from 9 to 10. Outdated clients get `versionMismatch` on `session:start` as today.

## New intents (client to server)

| Intent          | Payload          | Ack data   | Who      | Effect                                                                       |
| --------------- | ---------------- | ---------- | -------- | ---------------------------------------------------------------------------- |
| `rematch:start` | `{ round: int }` | none       | host     | Finished room becomes a lobby (data model); every member gets a `game:state` |
| `rematch:join`  | `{ round: int }` | `{ game }` | reserved | The player's reserved seat becomes human; ack carries the lobby view         |

`round` is the round of the finished game the client currently shows (`GameView.round`).

### Errors

| Case                                                                                    | `reason`                                   |
| --------------------------------------------------------------------------------------- | ------------------------------------------ |
| no session / not in a room / bad payload                                                | `noSession`, `notInGame`, `invalidRequest` |
| `rematch:start` by a non-host                                                           | `notHost`                                  |
| `rematch:start`, `round` is not the room's current round                                | `staleRound`                               |
| `rematch:start`, room is not finished (never reached by the check above, kept as guard) | `gameStarted`                              |
| `rematch:join`, `round` is not `room.round - 1`                                         | `staleRound`                               |
| `rematch:join`, no reservation for this player (left, removed, dropped, game started)   | `notRejoinable`                            |
| `rematch:join`, player is banned                                                        | `banned`                                   |

A rejected request changes nothing for anybody (no push, no log entry).

New `ErrorReason`: `staleRound`.

## Changed shared types

| Type          | Change                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------- |
| `GameView`    | `round: number`; `rematch?: 'open' \| 'closed'` (only in snapshot views); `you.reserved?: number` |
| `SeatView`    | `state` also `'reserved'`; for it `nickname` is the reserved player's nickname                    |
| `LogKind`     | `'rematch'`                                                                                       |
| `ErrorReason` | `'staleRound'`                                                                                    |
| `Intents`     | `rematch:start`, `rematch:join`                                                                   |

`GameSummary` is unchanged; `seatsUsed` counts reserved seats.

## Server behaviour changes

| Intent / event  | Behaviour                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game:state`    | Seated players get their normal view. Reserved players get the snapshot view with `rematch: 'open'`. Players dropped by the start get the snapshot view with `rematch: 'closed'` once, at the start. |
| `game:start`    | Reserved seats do not count toward the minimum or the ready check; on success they become `open` and their players are notified as above.                                                            |
| `game:leave`    | A reserved or dropped player is released (reservation freed); acks `ok`.                                                                                                                             |
| `seat:remove`   | Also accepts a `reserved` seat: frees it, bans the player, sends `game:closed { reason: 'banned' }` like for a seated player.                                                                        |
| `session:start` | A player with a reservation is released (reservation freed), no `game` in the ack.                                                                                                                   |
| room closed     | Reserved and dropped players are released and receive `game:closed`.                                                                                                                                 |
| `game:join`     | Unchanged; `seatNotFree` for a reserved seat, `nicknameTaken` for a reserved nickname.                                                                                                               |
| `game:rejoin`   | Unchanged (computer takeover in a running game); never touches a reserved seat.                                                                                                                      |

## Frontend

### `GameOver` (`table/game-over.ts`)

| Viewer               | View                              | Buttons                                                                 |
| -------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| host, seated         | `phase: 'finished'`, no `rematch` | `Rematch` (primary, sends `rematch:start`), `Back to the lobby`         |
| other, seated or not | `phase: 'finished'`, no `rematch` | `Rejoin` disabled with "waiting for the host" hint, `Back to the lobby` |
| other                | `rematch: 'open'`                 | `Rejoin` active (sends `rematch:join`), hint "seat reserved", `Back`    |
| other                | `rematch: 'closed'`               | `Rejoin` disabled, hint "game started without you", `Back`              |

A rejected `staleRound` or `notRejoinable` shows the standard error toast and leaves the modal as it is.

### `GameLobby`

A `reserved` seat shows the nickname, a tag "Reserved, not back yet" and, for the host, "Remove this player". The title row shows a "Rematch · round N" tag when `round > 1`. The start button and hint follow the lobby rules (the hint names the reserved players a start would drop).
