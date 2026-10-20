# Feature Specification: Leaner Socket Messages

**Feature Branch**: `017-leaner-socket-messages`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "R24. Leaner socket messages (docs/roadmap.md): send much less data over the live connection per change. Measure the payload size per event over a full game (2 and 8 players, with spectators) as a baseline. Instead of repeating the whole game view with every change, a client that enters a game (join, rejoin, watch, reload, rematch) gets one complete snapshot with everything it needs, including static values, the seat identities and the log. After that, only small, clearly named changes are sent (for example a turn result with its log entry, a dice preview, a seat change, the spectator counter). Every change carries a running number, so a client notices a missed change immediately and recovers a complete view on its own. Re-measure afterwards. Compression, binary encoding and a generic diff mechanism are not part of this feature; record the decision after the re-measurement."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Measure the baseline and the result (Priority: P1)

The maintainer wants to know how much data a game really sends, before and after the change, so that every optimisation is justified by numbers and not by guesses. A reusable measurement reports the payload size per event type over a complete game, for a small game (2 players) and a large one (8 players), each with and without spectators. It stays in the project so that anyone can measure the traffic again after later changes.

**Why this priority**: The roadmap marks the real payload sizes as open. Without a baseline neither the result nor the later decisions about compression and diffs can be judged.

**Independent Test**: Run the measurement on the unchanged game: it prints the size per event type and the total per client over a full game for each scenario. Run it again after the change and compare.

**Acceptance Scenarios**:

1. **Given** the game before any optimisation, **When** the measurement runs a full game with 2 players, **Then** it reports the size per event type, the total per client and how the size of the updates develops over the game.
2. **Given** the same measurement with 8 players and spectators, **When** it finishes, **Then** the report covers players and spectators separately.
3. **Given** the optimised game, **When** the measurement runs again with the same scenarios, **Then** the results are directly comparable with the baseline and are recorded together with it.
4. **Given** a later change to the game, **When** a maintainer runs the measurement, **Then** it works without modification and shows the new numbers.

---

### User Story 2 - Small, named changes during a game (Priority: P1)

During a game, every change (a throw, secured dice, ticking a die, a bank, a timer expiry, a computer move, a joining spectator, a seat change) reaches every player and spectator as a small message that says exactly what changed. Today each change repeats the whole game view, including the full log and all seat names, so messages grow as the game goes on. After the change, a turn result carries only the turn result and its log entry; ticking a die carries only the ticked dice; a seat change carries only that seat; the spectator counter carries only the number. Players on slow or mobile connections notice no growth in lag late in a long game, and the table looks and behaves exactly as before.

**Why this priority**: This is the core value and the main source of waste found in playtests.

**Independent Test**: Play a long game with 8 players and compare the size of a turn message early and late in the game: they are about the same. The table, the log and all seat names look exactly as they did before the change.

**Acceptance Scenarios**:

1. **Given** a running game with a long log, **When** any player acts, **Then** the message sent to every client contains only the new log entry, and its size does not depend on the log length.
2. **Given** a running game, **When** a player ticks a die, **Then** the other clients receive only the ticked dice, not the game view.
3. **Given** a running game, **When** a turn is played, **Then** no message repeats nicknames, computer names, rules, the game name or host settings.
4. **Given** a running game, **When** seats change (a player joins, leaves, reconnects, is replaced by a computer, is renamed, the host changes), **Then** every client, including spectators, shows the change immediately, and the message names only the changed seat.
5. **Given** a running game, **When** the host changes a setting, pauses or resumes the game, or the spectator count changes, **Then** all clients show it immediately via a message that carries only that change.

---

### User Story 3 - One complete snapshot when entering a game (Priority: P1)

Whoever enters a game - a player who joins or rejoins, a visitor who starts watching, a player who reloads the page, or everybody after a rematch - gets one complete snapshot: every seat with its name, the rules and settings, the whole log so far, the scores and the current action. Static values (rules, game name, host settings, card and text identifiers) are sent only in this snapshot. Nobody sees an empty log, missing names or a half-updated table, and nobody has to do anything to repair it. A player who waits for a rematch behind the game-over screen already has the finished table; a rematch decision reaches them as one small message, and a complete snapshot is sent only if they reload or reconnect there.

**Why this priority**: Sending less is only acceptable if nobody ever ends up with an incomplete view. The existing flows for rejoin, spectators and rematch must keep working unchanged.

**Independent Test**: In a running game with a long log, rejoin as a player, reload the page, start watching as a spectator and trigger a rematch: each time the client shows all names, the full log and the current state, and then follows the game live.

**Acceptance Scenarios**:

1. **Given** a running game with a long log, **When** a player reloads the page and rejoins, **Then** they see all seat names, the complete log and the current state.
2. **Given** a running game, **When** a visitor starts watching, **Then** they see all seat names, the complete log and the current state, and then follow later changes live.
3. **Given** a finished game, **When** the host starts a rematch in the same room, **Then** all clients, including spectators, receive a complete fresh snapshot with the new log.
4. **Given** a player who waits for the rematch behind the game-over screen, **When** the rematch opens or the next game starts without them, **Then** they see the new state through one small message, and when they reload there they get a complete snapshot.
5. **Given** a snapshot, **When** it reaches the client, **Then** it contains everything the table needs, so that no further request is necessary to display it.

---

### User Story 4 - A missed change is noticed and repaired automatically (Priority: P1)

Every change carries a running number that counts up from the start of the game, and a snapshot states the number of the last change it contains. A client that sees a change that does not directly follow its current number (for example snapshot 50, then change 60) knows at once that it missed something. It then asks for a fresh complete snapshot for itself and continues from there. Other clients are not affected and the game is not interrupted. Changes that are already contained in the snapshot are ignored, so nothing is applied twice. The player never sees a wrong table for more than a moment and does not have to reload.

**Why this priority**: Showing a wrong state is the main risk of switching from "everything every time" to small changes; it must be solved by design, not by hope.

**Independent Test**: In a test, drop or delay a change for one client: that client detects the gap, asks for a snapshot, and shows the same table as the others afterwards, while the others see nothing unusual. Also deliver a change twice: it is applied once.

**Acceptance Scenarios**:

1. **Given** a client at change number 50, **When** a change with number 60 arrives, **Then** the client does not apply it, requests a fresh snapshot and shows a correct table after the snapshot arrives.
2. **Given** a client that has just received a snapshot for change number 50, **When** changes numbered 49 or 50 arrive afterwards, **Then** they are ignored and not applied twice.
3. **Given** a client that reconnects after missing several changes, **When** the connection returns, **Then** it receives a complete snapshot and ends up in the same state as every other client.
4. **Given** several clients where one needs a snapshot, **When** it requests one, **Then** the other clients and the running game are not paused or disturbed.
5. **Given** changes that follow each other quickly, **When** they reach a client in order, **Then** the client shows them in order and never flickers back to an older state.

---

### User Story 5 - Decide on compression and generic diffs (Priority: P3)

After the re-measurement, the maintainer decides whether transport compression, a binary encoding or a generic diff mechanism is still worth its cost. None of them is built in this feature. The decision and the figures are recorded, and the roadmap is updated.

**Why this priority**: Guards against building complexity the numbers do not justify; follows the project principle of simplicity.

**Independent Test**: The documentation contains the post-change figures, the decision for each option (drop, postpone, or plan as a separate item) and the reason.

**Acceptance Scenarios**:

1. **Given** the final measurements, **When** the feature is finished, **Then** the roadmap states for compression, binary encoding and generic diffs whether they are dropped, postponed or planned separately, with the supporting figures.

---

### Edge Cases

- A client has the old version of the app open while the server is updated: the existing update/version handling applies, and no client is left showing a broken or empty game.
- The log reaches its maximum length and the oldest entries are dropped: clients that joined earlier and clients that joined later agree on the latest entries and see no duplicates.
- A rematch begins while spectators are watching: spectators get the fresh snapshot without rejoining, and the running number starts again for the new game.
- A seat is taken over by a computer player, or a player leaves, during a running game: the identity change reaches everybody, including spectators.
- A spectator joins or leaves: still only the counter changes for the others (spec 016 behaviour is unchanged).
- Several changes are caused by one action (for example a bank, a card draw and the start of the next turn): they reach every client in order; a client that misses any of them recovers by snapshot.
- A client asks for a snapshot while the game moves on: the snapshot states its number, so changes that came in the meantime are applied or ignored correctly.
- A client asks for snapshots repeatedly (for example due to a broken connection): the server limits the rate so that one client cannot cause load for the others.
- A client is in a game that no longer exists, or it was removed: the request is answered with the same notice as today and not with a snapshot.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The project MUST provide a reusable way to measure the size of every event type sent to clients over a complete game, for at least a 2-player and an 8-player game, each with spectators, reporting players and spectators separately.
- **FR-002**: A baseline measurement of the unchanged behaviour MUST be recorded before any optimisation, and the same scenarios MUST be re-measured afterwards; both results are recorded in the project documentation.
- **FR-003**: A client that enters a game (join, rejoin, start watching, reload, rematch) MUST receive one complete snapshot: all seats with identities, rules and settings, the game name and host, the complete log so far, scores, current action, spectator count and pause state.
- **FR-004**: After a snapshot, a running game MUST send only small, clearly named changes, each carrying only the data that changed (for example a turn result with its log entry, a dice preview, a seat change, a setting change, the spectator counter, pause or resume, a rematch decision). The former complete game update, sent to everyone after every change, MUST no longer exist.
- **FR-005**: The log MUST reach each client exactly once: complete in the snapshot, then entry by entry with the changes.
- **FR-006**: Static values (rules, game name, host settings, card and text identifiers) MUST be sent only in the snapshot, and again only when they change.
- **FR-007**: Seat identities (nicknames, computer names, host marker) MUST be sent in the snapshot and after that only when they change; a change MUST name only the seats it concerns and MUST reach all players and spectators.
- **FR-008**: The size of a turn message MUST NOT grow with the number of log entries or with the length of the game.
- **FR-009**: Every change message MUST carry a running number that counts up from the start of each game, and every snapshot MUST state the number of the last change it contains.
- **FR-010**: A client MUST apply a change only if its number directly follows the client's current number; it MUST ignore changes already contained in its snapshot; and on a gap it MUST ask for a fresh complete snapshot and apply nothing in between.
- **FR-011**: Requesting a snapshot MUST affect only the requesting client. The game, the timers and the other clients MUST continue undisturbed. The server MUST limit how often a single client can request snapshots.
- **FR-012**: Reconnecting players, rejoining players, spectators and all clients after a rematch MUST always receive a complete snapshot; none of these flows may depend on a prior state held by the client.
- **FR-013**: A player waiting for a rematch MUST receive the rematch decision as one small change, and a complete snapshot only when they enter that state anew (reload, reconnect).
- **FR-014**: Players and spectators MUST see exactly the same table, log, names and counters as before the change; no visible behaviour changes, and the spectator-counter rules of spec 016 stay unchanged.
- **FR-015**: The view shown to the user MUST still be built in a single place on the client, from the snapshot and the changes received, so that snapshots and changes cannot produce diverging views.
- **FR-016**: The protocol version MUST be raised so that clients and server of different generations are never mixed silently; the existing update handling covers outdated clients.
- **FR-017**: Compression, binary encoding and a generic diff mechanism MUST NOT be part of this feature; the decision on each MUST be made from the post-change measurements and recorded in the roadmap.
- **FR-018**: Automated tests MUST cover: the snapshot paths (rejoin, reconnect after missed changes, spectator start, rematch, waiting player), the gap detection and snapshot request, ignoring of already-applied changes, and the absence of log and unchanged identities in turn messages.

### Key Entities

- **Snapshot**: the complete view of a game for one participant (all seats with identities, rules and settings, the whole log so far, scores, current action) together with the number of the last change it contains; sent on entering, re-entering, after a rematch and on request.
- **Change**: a small, named message about one thing that happened (turn result with its log entry, dice preview, seat change, setting change, spectator counter, pause, rematch decision), carrying a running number.
- **Running number**: the per-game counter that orders changes from the start of a game; makes a missed or duplicated change visible to the client.
- **Log entries**: the ordered, length-limited record of what happened in the game; delivered as a complete list in a snapshot and one entry at a time with the turn results.
- **Seat identity**: nickname or computer name of a seat and the host marker; changes rarely.
- **Measurement report**: size per event type and total per participant for a scenario (player count, with or without spectators), before and after the change.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a full 8-player game, the size of a turn message late in the game (log at its maximum) is within 10% of the size of a turn message early in the game.
- **SC-002**: The total data sent per player over a complete 8-player game is at least 70% lower than the recorded baseline; the figure reached is recorded.
- **SC-003**: The total data sent per spectator over the same game is reduced by at least as much as for players.
- **SC-004**: In 100% of the tested entry paths (rejoin, reload, reconnect after missed changes, spectator start, rematch, waiting player), the client shows a complete game (all names, complete log, current state) without manual action.
- **SC-005**: In tests with dropped, delayed, duplicated and reordered changes, every client ends up with the same table as an undisturbed client, within one second of noticing the gap, and without a visible wrong state lasting longer.
- **SC-006**: No visible difference for players: the existing end-to-end flows and spectator flows pass unchanged.
- **SC-007**: The baseline, the post-change measurements and the decisions on compression, binary encoding and diffs are documented with figures.

## Assumptions

- The goal is less data per change, not fewer changes; the number of events per action may stay as it is, and a change message may be split per concern where that is clearer.
- The reduction target of 70% is derived from the roadmap's observation that the log and the seat names make up most of every message; the measurement may adjust the figure, and the final figure is recorded.
- Games are played with at most 8 players and a modest number of spectators, as in spec 016.
- Messages on one connection arrive in order; gaps arise when a connection drops and returns or when a message is lost, so a per-client snapshot request is enough, and a server-wide pause to resynchronise everybody is not needed.
- Event names and message formats are decided in the plan; this spec fixes the behaviour only.
- Persistence, save/load and replay are out of scope; this feature only shares the "complete snapshot" idea with them.
- The measurement tool is a development aid, not a user-facing feature.
