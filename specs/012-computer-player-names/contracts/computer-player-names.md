# Realtime Contract: Computer Player Names

This is the intended Socket.IO behavior contract. Concrete event names should follow the existing `Intents` naming conventions in `libs/game-rules/src/lib/protocol.ts`.

## Session language

- `session:start` carries the current UI `language: 'en' | 'de'` on both first connection and token-based resume.
- When a connected player changes UI language, the frontend sends the updated language to the server. The server validates and stores it on the session and that player's human seat.
- The backend does not trust client language when generating arbitrary names: it reads the stored locale associated with the applicable host.
- Unknown locale uses English.

## Computer seat representation

- Every occupied computer `SeatView` contains its authoritative `name`.
- The lobby view, reconnect snapshot and all later table state derive their computer display name from the same stored room-seat identity.
- Engine `GameState.players` uses that same name, so the running table and final result remain consistent.
- No client generates or locally substitutes a computer display name.

## Host rename intent

`seat:rename { seat, name? }`. An omitted name rolls a new unique name in the host language. The backend MUST:

1. Require that the sender is current host.
2. Require an occupied computer seat; humans, open/locked seats and finished games are not rename targets.
3. Apply the same normalization, allowed-character and length rules as human nicknames.
4. Reject blank or case-insensitive duplicate names without changing state.
5. Only allow renaming in the lobby (not once the game has started).
6. On success, update the room seat and broadcast the updated view to every client.

The acknowledgement/rejection uses existing gateway result/error conventions. It must identify invalid/duplicate input with a localized UI message; authorization and state validation remain server-side.

## State and lifecycle behavior

- Generated names are selected only on the server and returned with seat state.
- A new lobby computer and every takeover receive a unique name at creation time.
- On host departure, name language is resolved from that departing host's retained seat language before host election can overwrite current-host context. A delayed disconnect takeover uses the same retained value.
- Rejoin replaces the computer identity with the former player's nickname without resetting their score or engine index.
- Completed games cannot be renamed; historical results remain stable.
- Increment `PROTOCOL_VERSION`; clients with a mismatching version follow existing rejection behavior rather than partially accepting name fields/events.
