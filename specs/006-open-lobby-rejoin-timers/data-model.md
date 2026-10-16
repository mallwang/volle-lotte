# Data Model: Open Lobbies, Rejoin, Leave Warning and Turn Timers

In-memory only (`GameRoom`); no migration.

## Seat (server)

| State      | Fields (changes in bold)                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| `open`     | none                                                                                                 |
| `locked`   | none (also used for a seat the host closed on a player)                                              |
| `human`    | `playerId`, `nickname`, `connected`, `ready`, `disconnectedAt?`, **`timeouts: number`**              |
| `computer` | `difficulty`, `effective`, **`former?: { playerId, nickname }`** (set only when it replaced a human) |

## GameRoom additions

| Field          | Type                                        | Notes                                                   |
| -------------- | ------------------------------------------- | ------------------------------------------------------- |
| `passwordHash` | `string`                                    | `''` = open game                                        |
| `banned`       | `Set<string>` of playerIds                  | filled by `seat:remove`; checked in `join` and `rejoin` |
| `turnDeadline` | `{ at: number; phase: Phase } \| undefined` | armed per human action, cleared in `apply`/`dispose`    |
| `pending`      | removed                                     | host-decision flow is gone                              |

## Constants

`GRACE_MS = 30_000`; `TURN_LIMIT_MS = { draw: 10_000, throw: 10_000, select: 15_000, decide: 15_000 }`; `MAX_TIMEOUTS = 3`; warning shown when `timeouts === MAX_TIMEOUTS - 1`.

## State transitions

```text
human --leave(running) / grace 30 s / 3rd timeout--> computer(former = human)
computer(former) --rejoin by same playerId--> human (timeouts = 0, score kept)
human(lobby) --seat:remove--> locked, playerId in banned
human --own action--> timeouts = 0
human --timer expiry--> auto action, timeouts + 1
```

## Rules engine

`skipTurn(state): GameState` (pure, `libs/game-rules`): next player's fresh turn, scores unchanged; returns the state unchanged when `result` is set.

## Views

`SeatView` gains `former?: { nickname }` (no playerId leak), `timeouts` is not exposed; `GameView` gains `turnDeadline?: { at: number; phase: Phase }` and `you.timeoutWarning: boolean`. `GameSummary` replaces `locked: true` with `protected: boolean`, adds `rejoinable: boolean` (per requester). See [contracts/protocol.md](contracts/protocol.md).
