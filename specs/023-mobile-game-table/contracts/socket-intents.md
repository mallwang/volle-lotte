# Contract: socket intents and pushes used by the mobile table

Source of truth: `libs/game-rules/src/lib/protocol.ts`. The mobile table adds no events and changes none (FR-020). Intents are refused client-side while offline (`reason: 'offline'`).

## Intents (client to server, acknowledged)

| Event          | Payload                                                              | Used for                                                 |
| -------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| `turn:action`  | `{ action: { type: 'draw' \| 'throw' \| 'select' \| 'bank', ... } }` | The four turn buttons; `select` carries the chosen dice. |
| `turn:preview` | `{ dice: number[] }`                                                 | Live selection while my turn, shown to other players.    |
| `game:leave`   | none                                                                 | Leave confirmation; the seat becomes a computer.         |
| `game:sync`    | `{ n }`                                                              | After a gap in `game:change`, as in M1.                  |
| `game:rejoin`  | `{ gameId }`                                                         | Reload on the table route or entry from the list.        |

An ack with `ok: false` shows the mapped error message in the status line and clears `pending`.

## Pushes (server to client)

`game:snapshot` and `game:change` (rendered through `applyChange` and `decodeView`), `game:closed` (back to the list), `session:replaced` (as in M1). `game:settingsChanged` is handled so rules shown in the strip stay current.

## Client rules

- No optimistic updates: the view changes only on a push.
- One in-flight action at a time (`pending`); `turn:preview` is not blocked by it.
