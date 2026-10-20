# Contract: Socket protocol (version 13)

Replaces version 12 ([contract of spec 017](../../017-leaner-socket-messages/contracts/protocol.md)). Events, intents, the running number `n`, gap detection, `game:sync` and its rate limit are unchanged. Only the content of snapshots and `game:change` changes.

## What changes

| Place                                                      | Version 12                  | Version 13                                                                   |
| ---------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| `GameChange.game`                                          | whole state on every change | whole state only when the recipient has none; `null` = no game               |
| `GameChange.gameDiff`                                      | -                           | changed players, current player, turn fields, result, pile size              |
| `GameChange.you`                                           | whole `you`                 | only the changed keys; `reserved: null` removes it                           |
| `GameChange.turnDeadline`                                  | new value or `null`         | new value, or `null` only when the client cannot infer the clearing (rule D) |
| `GameChange.log`, `game:snapshot.game.log`, ack `game.log` | `LogEntry[]`                | `WireLogGroup[]`                                                             |
| `PROTOCOL_VERSION`                                         | 12                          | 13                                                                           |

Everything else in `GameChange` (`hostId`, `phase`, `rematch`, `seats`, `settings`, `spectators`, `paused`, `preview`) is as in version 12.

## Rules

### Server

1. `push()` is as in spec 017: `r = diffView(prev, next)` on rich views; `null` sends nothing and keeps `n`.
2. `diffView` fills `gameDiff` when both views have a game and the number of players is equal; `game` when `prev.game` is missing; `game: null` when `next.game` is missing.
3. The log of a snapshot (ack, `game:snapshot`) and of a change is encoded by `encodeLog` at the send boundary (`view-sync.service.ts`); the cache keeps rich views.
4. `session:start` with `protocolVersion !== 13` is answered `versionMismatch` and the socket gets no pushes (unchanged mechanism).

### Client

1. Every snapshot goes through one `adopt()` that runs `decodeLog` on `game.log`.
2. `applyChange` applies `game`, `gameDiff` (via `applyGameDiff`), the partial `you`, the log (decoded and appended, trimmed to `LOG_CAP`) and rule D, in this order, and sets `lastN = n` as in spec 017.
3. A `versionMismatch` from `session:start` shows `error.versionMismatch` (reload request) and leaves no table behind.

## Example: card drawn (4 players)

```json
[
  "game:change",
  {
    "n": 19,
    "gameDiff": { "turn": { "phase": "throw", "card": "plusMinus" }, "deckSize": 54 },
    "log": [{ "at": 1792499199975, "seat": 1, "e": [{ "kind": "cardDrawn", "card": "plusMinus" }] }]
  }
]
```

About 150 bytes instead of 747 (SC-001: at least 60% smaller).

## Example: player banks 500

```json
[
  "game:change",
  {
    "n": 40,
    "gameDiff": {
      "players": [[1, { "score": 500 }]],
      "current": 2,
      "turn": { "phase": "draw", "card": null, "dice": [], "free": 0, "run": 0, "carried": 0 }
    },
    "log": [
      {
        "at": 1792499290000,
        "seat": 1,
        "e": [
          { "kind": "banked", "points": 500 },
          { "kind": "turnEnded", "next": 2 }
        ]
      }
    ]
  }
]
```

The clearing of the old deadline is not sent: `gameDiff.current` makes the client drop it (rule D); a new `turnDeadline` would travel in the same message if the next player is a human.

## Example: timeout warning

```json
["game:change", { "n": 18, "you": { "timeoutWarning": true }, "log": [...] }]
```
