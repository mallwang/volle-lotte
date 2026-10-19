# Data Model: Spectators

All state is in memory in the backend; nothing is persisted.

## GameRoom (extended)

| Field        | Type          | Notes                                                               |
| ------------ | ------------- | ------------------------------------------------------------------- |
| `spectating` | `boolean`     | Host setting, default `true`; set in lobby or running phase.        |
| `spectators` | `Set<string>` | Player ids of connected spectator sessions. Never includes players. |

Rules:

- `spectators` only grows while `phase === 'running'` and `spectating`; it is cleared when `spectating` turns off, when a rematch starts, and when the room closes.
- Never counted by `humans()`, `hasConnectedHuman()`, `closeIfEmpty()` or the turn/timeout logic (FR-008).
- Joining or leaving writes no log entry.

## Session (extended)

| Field        | Type      | Notes                                                                                                                  |
| ------------ | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `spectating` | `string?` | Room id this session watches; kept across a disconnect so a reload resumes watching (FR-013). Exclusive with `gameId`. |

## GameView (extended, see [contracts/protocol.md](contracts/protocol.md))

| Field           | Type       | Notes                                                |
| --------------- | ---------- | ---------------------------------------------------- |
| `you.spectator` | `boolean?` | `true` for a spectator's view; `you.seat` is `-1`.   |
| `spectating`    | `boolean`  | Host setting; the counter is shown only when `true`. |
| `spectators`    | `number`   | Current number of spectators.                        |

## GameSummary (extended)

| Field         | Type      | Notes                                                                               |
| ------------- | --------- | ----------------------------------------------------------------------------------- |
| `spectatable` | `boolean` | `phase === 'running' && spectating`; the games list shows "Watch" only when `true`. |

## State transitions

```text
visitor --game:spectate (running, spectating on, password ok)--> spectator
spectator --game:leave | disconnect--> removed from set (count -1)
spectator --session:start (room running/finished, spectating on)--> spectator again
host sets spectating=false --> all spectators: game:closed(spectatingOff), set cleared
rematch:start / room closed --> all spectators: game:closed(ended|cleanup)
```
