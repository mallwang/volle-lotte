# Contract: socket protocol changes (version 11)

Defined in `libs/game-rules/src/lib/protocol.ts`. `PROTOCOL_VERSION`: 10 to 11.

## New intent

```ts
'game:spectate': [{ gameId: string; password: string }, { game: GameView }];
```

Errors (`ErrorReason`): `noSession`, `invalidRequest`, `gameNotFound`, `alreadyInGame` (player or spectator elsewhere), the new reason `notSpectatable` (game not running, or the host switched spectating off), `banned`, `invalidPassword`, `wrongPassword`, `locked` (same semantics and rate limit as `game:join`).

New `ErrorReason`: `'notSpectatable'`.

## Changed intents

- `game:leave`: also valid for a spectator (leaves, no log entry).
- `game:settings`: `GameSettings.spectating?: boolean`, host only. Counts as a valid patch on its own.
- All play intents (`turn:*`, `seat:*`, `game:start`, `game:pause`, `rematch:*`): unchanged; a spectator session answers `notInGame`.
- `session:start`: when the session spectates a room that still allows it, the ack carries the spectator's `game` view.

## Changed types

```ts
GameView.you: { playerId; seat; timeoutWarning; reserved?; spectator?: boolean }  // spectator => seat -1
GameView.spectating: boolean   // host setting
GameView.spectators: number    // current count
GameSummary.spectatable: boolean
GameSettings.spectating?: boolean
SettingChange.setting: keyof GameSettings   // includes 'spectating'
Pushes['game:closed'].reason: 'cleanup' | 'banned' | 'ended' | 'spectatingOff'
```

## Behaviour guarantees

- A spectator's `GameView` equals a player's, plus `you.spectator`; no deck, no password hash, no tokens.
- `game:state` is pushed to spectators on every room change, like to players.
- Spectator join/leave: one `game:state` push (count changes); no `game:log` entry, no `game:settingsChanged`.
- `game:settingsChanged` is pushed to players only; spectators receive `game:closed` (`spectatingOff`) when the host turns spectating off.
