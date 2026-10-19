# Research: Spectators

All unknowns from the Technical Context are resolved from the existing code; no external research was needed.

## 1. Where spectators live on the server

- **Decision**: `GameRoom` gets `spectating: boolean` (default `true`) and `spectators: Set<string>` of player ids of currently connected spectator sessions. `Session` gets `spectating?: string` (room id) next to `gameId`. A spectator never has a seat and `session.gameId` stays unset.
- **Rationale**: Leaving `gameId` unset makes every existing play intent (`inRoom`) answer `notInGame`, so FR-004 holds without per-intent checks. The seat, timer and cleanup logic only looks at `humans()` and is therefore untouched (FR-008). The name `watchers()` already means "players waiting for a rematch", so the new concept is called `spectators` throughout.
- **Alternatives**: a pseudo seat per spectator (breaks the 2-8 limit and the seat model); a separate Socket.IO room per game for spectators (extra state without a gain, the registry already sends targeted pushes).

## 2. Counter and join/leave without noise

- **Decision**: The count is `room.spectators.size`, sent as `GameView.spectators` inside the normal `game:state` push. Join and leave call the room's change callback with an empty entry list, so no log line is written and no `game:log` push happens. The existing client toasts come from `game:settingsChanged` and `game:closed` only, so no toast appears.
- **Rationale**: Reuses the push path (Constitution VII). A `game:state` with unchanged game data must not retrigger dice animation; the frontend already receives such pushes on connection changes. Verified in the plan phase by reading `socket.service.ts`; a frontend test guards it.
- **Alternatives**: a dedicated `game:spectators` push (one more event type for a number); counting inside the log (forbidden by FR-007).

## 3. Who may watch, and when

- **Decision**: `game:spectate` is allowed only while the room is `running` and `spectating` is on; protected rooms require the password through the same check and rate limiter as `game:join` (extracted into a shared helper). Players of the room (`roomOf`), banned players and sessions that already spectate are refused. `GameSummary.spectatable` tells the games list whether to show "Watch".
- **Rationale**: Matches the spec (running games only, password equals player rule). Open question from the roadmap resolved as an assumption in the spec.
- **Alternatives**: separate spectator password (more UI, not requested); watching finished games (no live value).

## 4. End of the spectator's stay

- **Decision**: A spectator leaves via `game:leave` (spectator branch), or is sent back by `game:closed` with the existing reasons: `cleanup`/`ended` when the room closes, a new reason `spectatingOff` when the host turns the setting off, and `ended` when a rematch reopens the room as a lobby. A disconnect removes the session from `spectators`; `session:start` re-adds it (and returns the view) if the room is still running or finished and spectating is on (FR-013).
- **Rationale**: Reuses `game:closed` so the client already knows how to drop the game and show a one-time message. A finished game stays visible to spectators until they leave or the room closes (game-over view, FR-015).
- **Alternatives**: keeping spectators in the rematch lobby (spec says no).

## 5. Host switch

- **Decision**: `GameSettings.spectating?: boolean` through the existing `game:settings` intent, host only, applies in lobby and running phases. Turning it off clears `spectators` and the gateway emits `game:closed` (`spectatingOff`) to each. Players get the existing settings toast text (`toast.setting.spectating.on/off`); spectators get none besides their own message.
- **Rationale**: Same path as the other host settings (validation, host check, toast to players), no new intent.
- **Alternatives**: a separate `game:spectating` intent (duplicates validation).

## 6. Protocol version

- **Decision**: Bump `PROTOCOL_VERSION` to 11. Changes are additive on the wire, but old clients would misinterpret `you.seat === -1` as "a computer took my seat" for spectators, and the PWA update rule (lobby only) already handles the roll-out.
- **Alternatives**: keep 10 (old clients show a wrong "removed" state to spectators); there is none, since an old client cannot become a spectator.

## 7. Frontend seat semantics

- **Decision**: `you.spectator: true` marks a spectator explicitly; `isSpectator(view)` in `game-view.ts` is the single check. `table.ts` `removed` (seat < 0 means a computer took the seat) must exclude spectators.
- **Rationale**: Reusing `seat === -1` alone is ambiguous; this was found when reading `table.ts`.
