# Contract: Game-Over Modal

## Realtime (Socket.IO)

No new events and no changed payload shapes; `PROTOCOL_VERSION` stays. Behaviour changes:

| Intent / event  | In a finished game                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session:start` | If the session's room is finished, the player is released from it (seat handed over as in the data model, `session.gameId` cleared, lobby joined). The ack has no `game`. No error. |
| `game:leave`    | Acks `ok`; the seat stays in the room as a departed seat; the room closes when no human is left.                                                                                    |
| socket close    | Immediate release as for `game:leave`, no grace period, no `disconnected` log entry.                                                                                                |
| `game:state`    | Remaining players receive the unchanged seat list with the leaver's seat as a named computer seat, plus a `left` log entry.                                                         |

Unchanged: all rejected intents on a finished room (`notInGame`), `game:rejoin` (needs a running game), the running-game rules.

## Frontend

### `Celebration` (`core/celebration.ts`, root service)

| Method    | Behaviour                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `start()` | No-op if already running or if the system asks for reduced motion. Otherwise bursts of confetti now and every 3 s while the document is visible. |
| `stop()`  | Stops the repeating bursts; particles already in flight fade out by themselves.                                                                  |

### `GameOver` (`table/game-over.ts`)

Inputs: the `GameView` and `visible`. Outputs: none (the button calls `SocketService.leave()`).

- PrimeNG dialog: modal, not closable, no Escape, not draggable, no dismissable mask; header = title text; `role=dialog` and the label come from PrimeNG; focus lands on the button.
- Content: a sentence for the outcome ("You won!" for the winner, otherwise "{name} won."), the way the game ended (target score or Clover), the ranking list (rank tag, names with scores, trophy icon for rank 1, the player's own row marked), the button "Back to the lobby".
- Texts: new keys `gameOver.title`, `gameOver.won`, `gameOver.winner`, `gameOver.reason.targetScore`, `gameOver.reason.clover`, `gameOver.rank`, `gameOver.you`, `gameOver.back` in English and German; the old `result.*` keys are removed.

### Leaving

- `leaveGameGuard`: when the game is finished it calls `socket.leave()` instead of returning early; no confirmation (the situation stays `none`).
