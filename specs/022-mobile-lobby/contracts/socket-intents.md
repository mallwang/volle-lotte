# Contract: socket intents and pushes used by the mobile lobby

Source of truth: `libs/game-rules/src/lib/protocol.ts` (`Intents`, `Pushes`, `Ack`). The mobile app adds no events and changes none (FR-015).

## Intents (client to server, acknowledged)

| Event                                    | Used for                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `session:start`                          | Start or resume a session (nickname, stored token, `PROTOCOL_VERSION`, language). |
| `lobby:list`                             | Initial game list after (re)connect.                                              |
| `game:create`                            | Create a game from the form.                                                      |
| `game:join`                              | Join with seat and password.                                                      |
| `game:leave`                             | Leave or withdraw.                                                                |
| `seat:set`, `seat:rename`, `seat:remove` | Host: open, lock or fill a seat with a computer, rename, remove.                  |
| `seat:ready`                             | Become or stop being ready.                                                       |
| `game:settings`                          | Host: change settings.                                                            |
| `game:start`                             | Host: start once everyone is ready.                                               |

Intents are refused client-side while offline (`reason: 'offline'`).

## Pushes (server to client)

`lobby:games`, `game:snapshot`, `game:change`, `game:settingsChanged`, `game:closed`, `session:replaced`. `game:change` with a gap in `n` triggers a `game:sync` request, as on desktop.

# Contract: mobile routes (base `/m/`)

| Path       | Screen                     | Guard                                         |
| ---------- | -------------------------- | --------------------------------------------- |
| ``         | Game list                  | session required                              |
| `nickname` | Nickname                   | none; redirects to list when a session exists |
| `create`   | Create game                | session required                              |
| `game/:id` | Lobby (host or guest view) | session and membership in that game           |
| `started`  | Game-started notice        | session required                              |
| `**`       | redirect to ``             | n/a                                           |
