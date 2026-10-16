# Contract: protocol v3 changes

`PROTOCOL_VERSION` 2 → 3. Clients on v2 get `versionMismatch` (existing behaviour).

## Types (`libs/game-rules/src/lib/protocol.ts`)

```ts
export interface GameSummary {
  /* id, name, host, targetScore, seatsUsed, seatsTotal, phase as before */
  protected: boolean; // replaces `locked: true`
  rejoinable: boolean; // the requesting player's own bot-held seat is in this game
}

export interface SeatView {
  /* as before */
  former?: { nickname: string }; // computer seat that replaced a human
}

export interface GameView {
  /* remove: pending, graceEndsAt */
  turnDeadline?: { at: number; phase: 'draw' | 'throw' | 'select' | 'decide' };
  you: { playerId: string; seat: number; timeoutWarning: boolean };
}
```

`turnDeadline.at` already includes the animation wait; it is only set while a human is to act.

## Intents

| Event         | Payload                            | Ack data   | Errors                                                     |
| ------------- | ---------------------------------- | ---------- | ---------------------------------------------------------- |
| `game:create` | `password` may be `''` (open)      | `{ game }` | `invalidPassword` only for 1–3 or > 64 chars               |
| `game:join`   | `password` ignored for open games  | `{ game }` | `banned`, `gameStarted`, `gameFull`, `nicknameTaken`, …    |
| `game:rejoin` | `{ gameId }` (new)                 | `{ game }` | `gameNotFound`, `notRejoinable`, `banned`, `alreadyInGame` |
| `seat:remove` | `{ seat }` (new, host, lobby only) | `object`   | `notHost`, `gameStarted`, `invalidRequest`, `seatNotFree`  |
| `host:decide` | removed                            | -          | -                                                          |

`ErrorReason` adds `banned`, `notRejoinable`; removes `nothingPending`, `paused`.

`game:leave` is unchanged on the wire; in a running game it now means "replace me by a bot".

## Pushes

- `lobby:games` / `lobby:list` are per player (carry `rejoinable`).
- `game:closed` reason gains `'banned'` (sent to the removed player; client shows the removal modal). `'removed'` is dropped from the union once `host:decide` is gone.

## LogKind

Added: `replaced` (data: `'left' | 'disconnected' | 'timeouts'`), `rejoined`, `timedOut` (data: action `draw|throw|select|bank`), `removed`. Removed: `waitingForHost`, `hostDecided`.
