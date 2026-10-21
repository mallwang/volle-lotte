# Data Model: Mobile lobby and game setup

No server or storage changes. All entities exist in `game-rules` or `client-core`; the mobile client only holds them in signals.

| Entity       | Source                                                                                                  | Fields used on mobile                                                                      | Notes                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Session      | `volle-lotte.session` in `localStorage` (`{ token, nickname }`) plus in-memory `{ playerId, nickname }` | nickname, token, playerId                                                                  | Shared with desktop; removed when `session:start` fails.                  |
| Game summary | `GameSummary` (`lobby:list`, `lobby:games`)                                                             | id, name/host, seats taken/total, locked flag, phase                                       | Cards on the list; a running game shows status only.                      |
| Game view    | `GameView`, decoded from `WireView`                                                                     | phase, seats, host, settings, `n` (change counter)                                         | `game:snapshot` replaces it, `game:change` advances it via `applyChange`. |
| Seat         | `GameView.seats[i]`                                                                                     | `state` (`open`, `locked`, `human`, `computer`, `reserved`), name, ready, difficulty, risk | Host edits via `seat:set`/`seat:rename`; guests read only.                |
| Setup        | `client-core` `Setup`                                                                                   | seats, computer plans, settings, game name, password                                       | Create-form state; `sanitizeSetup` validates; no preset persistence.      |
| Connection   | `online` signal                                                                                         | connected flag                                                                             | Drives the offline banner and disables actions.                           |

## State transitions (client view)

`no session` -> (nickname, `session:start` ok) -> `list` -> (`game:create`/`game:join` ok) -> `lobby` -> (`game:leave` ok) -> `list`; lobby -> (phase becomes running) -> `started` notice; `session:replaced` or failed replay -> `no session`; `game:closed` -> `list` with a banner.
