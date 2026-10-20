# Contract: Socket protocol (version 12)

Replaces version 11. The connection, the session and the lobby events are unchanged.

## Server to client pushes

| Event           | Payload              | When                                                                                                                                                  |
| --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game:snapshot` | `{ game: GameView }` | A recipient's whole view must be replaced without a request: rematch start, switch between the waiting view and a normal view, any structural change. |
| `game:change`   | `GameChange`         | Every other accepted change that differs from what the recipient has. At most one per recipient per change.                                           |
| `game:state`    | _removed_            |                                                                                                                                                       |
| `game:log`      | _removed_            | Log entries travel in `GameChange.log`.                                                                                                               |

Unchanged: `lobby:games`, `game:settingsChanged` (toast text for settings changes), `session:replaced`, `game:closed`.

## Client to server

| Intent      | Payload     | Ack                                | Notes                                                                                                                                                                                                     |
| ----------- | ----------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game:sync` | `undefined` | `{ game: GameView }` or `ErrorAck` | Own snapshot for the current game, player or spectator. Errors as `game:rejoin`: `noSession`, `notInGame`. Rate limit 5 per 10 s per session, then `ErrorAck` with `reason: 'locked'` and `retryAfterMs`. |

The acks of `session:start`, `game:join`, `game:spectate`, `game:rejoin` and `rematch:join` keep returning `game: GameView`, now with `n`.

## Rules

### Server

1. Every `GameView` handed to a client (ack or `game:snapshot`) is built by `toView` and registered in the cache with the recipient's counter; its `n` is the counter value.
2. After each room change, `push()` runs for every cache entry: `next = toView(room, id)`; `r = diffView(prev, next)`.
   - `null`: send nothing.
   - change: `n += 1`, send `game:change { n, ...parts }`, store `next`.
   - structural: `n += 1`, send `game:snapshot { game: { ...next, n } }`, store `next`.
3. A client without a cache entry gets no pushes.
4. `game:change.log` holds the entries between the previous `logEnd` and the new one, never more than `LOG_CAP`.
5. The room's `onChange(entries)` argument is no longer used to send entries.

### Client

1. A snapshot (ack, `game:snapshot`, `game:sync` ack) replaces the view and sets `lastN = game.n`.
2. `game:change` with `n <= lastN`: ignore.
3. `game:change` with `n === lastN + 1`: `game = applyChange(game, change)`, `lastN = n`.
4. Otherwise, or if there is no view: send `game:sync` once (if none is pending); drop changes until the ack; on error show the same notice as a failed rejoin.
5. On socket reconnect the existing session replay returns a snapshot; no change is applied before it.

### What counts as structural (`diffView` returns `'snapshot'`)

- `round`, `id`, `name` or `rules` differ.
- The log is shorter than before or `logBase` moved backwards, or the view switches between waiting and normal.
- `you.spectator` flips.

Everything else is expressed with the parts in `data-model.md`.

## Example sequence

```text
S  --ack(game:spectate)-->      { ok, game: GameView(n=7) }
A  --turn:action(throw)-->      server
S  <--game:change--             { n: 8, game: {...}, preview: [], log: [<thrown>] }
B  <--game:change--             { n: 31, game: {...}, preview: [], log: [<thrown>] }
S  <--game:change--             { n: 9, spectators: 2 }
S  <--game:change--             { n: 11 ... }      (10 was lost)
S  --game:sync-->               server
S  <--ack--                     { ok, game: GameView(n=11) }
```

(`n` is per recipient: S and B count independently.)
