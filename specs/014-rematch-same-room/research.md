# Research: Rematch in the Same Room

## Decision 1: Reuse the room and add a round counter

**Decision**: `rematch` turns the finished `GameRoom` back into `lobby`. The room keeps id, name, password hash, rules, host, banned set and settings, and gets `round` (starting at 1, incremented by each rematch). Engine state, deck, preview, pause flag and timers are reset; the log is cleared (its `logBase` advances so entry indices stay unique) and a `rematch` entry is added.

**Rationale**: The spec fixes "same room, same game id, same password". Everything a rematch must keep already lives on the room object; only play state must go. A counter is the smallest thing that lets the server tell the finished round from the next one.

**Alternatives considered**: A new room that copies the settings (new id, password hash, invitation of every player; more code and breaks "same game" for the games list); an epoch string instead of a counter (no benefit, the counter is comparable and printable in the UI "round 2").

## Decision 2: Waiting players hold a `reserved` seat and keep the finished view

**Decision**: At rematch every human except the host gets `{ state: 'reserved', playerId, nickname, language }` on their seat. Their session keeps `gameId`, so they stay in the room's watcher set (as former players already do for the takeover notice). While reserved they get a view built from a snapshot of the finished game (`archive`: finished engine state, seats, log, host id, round), with `phase: 'finished'` and `rematch: 'open'`. Rejoining turns the seat human again and returns the normal lobby view.

**Rationale**: The client already switches on `phase`: `finished` shows the table and the game-over modal, `lobby` shows the lobby. Serving waiting players the finished view needs no client rule like "lobby plus no seat plus keep the old table" and no client-side cache. The existing watcher push (`push` in the gateway) gives them the "Rejoin is active now" update without a reload.

**Alternatives considered**: Sending them the lobby view and letting the client keep the last finished view locally (every reader of `socket.game()` would need the second source, and the server could not tell a legitimate waiting client from a stale one); releasing them from the room and notifying by a new push (they would be in the games list, no table behind the modal, and the "seat reserved" state would be client-only).

## Decision 3: What the round marker protects

**Decision**: `GameView.round` is the room round. A waiting player's snapshot view carries the round of the finished game; the lobby view of the next game carries the next round. `rematch:start` and `rematch:join` send the round of the finished game the client shows. The server rejects a request whose round is not the current finished round (start: equals `room.round`; join: equals `room.round - 1`) with `staleRound`, and changes nothing.

**Rationale**: The same game id is reused, so the id alone cannot say which round a request refers to. A stale modal (older rematch, second tab, delayed click) is the only source of such requests; reconnects of players who left are covered by Decision 5. Checking the number is cheap and testable.

**Alternatives considered**: Rejecting by phase only (a stale "rejoin" in a later lobby of the same room would pass the phase check); a random round token (not needed, nothing is guessable by an attacker: the identity is the session token).

## Decision 4: Seats at rematch

**Decision**: Locked and open seats stay as they are. Computers without `former` (set up by the host) stay with their name, skill and risk. Computer seats with `former` (a human who left a finished game, or whom a computer replaced during play) become `open`. The host stays human and not ready. All other humans become `reserved`. Seat order never changes.

**Rationale**: A `former` computer is a placeholder for a missing person, not a host decision; the spec says leavers lose their seat. Open seats are what the host and newcomers can fill, and they match "fewer players" if nobody comes.

**Alternatives considered**: Keeping former computers (would turn leavers into computers for ever and the host would have to remove them one by one); shuffling seats (R17).

## Decision 5: Reload, reconnect and leaving

**Decision**: `session:start` for a player who has a reservation drops it (same as leaving) and returns no `game`; the client lands in the games list. `game:leave` from a reserved or dropped player frees the reservation. The existing 013 rule stays: a connection that drops in a finished room is a leave, so waiting players never exist for a player who already left.

**Rationale**: Matches the answer "rejoin only if still active in the modal" and the 013 reload rule, and means a reservation never outlives its presence. The seat is open again for newcomers.

**Alternatives considered**: Offering the reservation in the games list after a reload (needs `rejoinable` for lobby rooms and a password-free path; more rules than the request asks for).

## Decision 6: The start with missing players

**Decision**: `start` ignores `reserved` seats for the minimum-players check and the ready check, and on success turns them into `open`. The players concerned get one last push with the snapshot view and `rematch: 'closed'` (modal shows "Rejoin" disabled and only "Back to the lobby" works). They stay in the room's session until they leave or reload.

**Rationale**: The host-first rule must not be blocked by an absent player (FR-010, SC-004), and the approved mockup has a "game started" state for the modal.

**Alternatives considered**: Releasing them from the room at start (the modal would vanish without explanation).

## Decision 7: Existing computer-takeover `game:rejoin` is separate

**Decision**: `game:rejoin` (a running game, a computer holds your former seat) is unchanged and cannot touch a reserved seat; `rematch:join` only works for a reserved seat of this player. Different intents, different checks, different seat shapes.

**Rationale**: The spec asks that the two "rejoin" meanings cannot be confused. Separate intents with their own errors make a mix-up impossible by construction.

**Alternatives considered**: Extending `game:rejoin` to lobby rooms (one name, two meanings, easy to misuse).

## Decision 8: Host leaves the rematch lobby

**Decision**: The existing lobby rules apply: a leaving host hands over to another human; if no human is left the room closes. Reserved and dropped players are then told with `game:closed` and released.

**Rationale**: Without a human nobody could start; waiting players must not stay attached to a dead room.
