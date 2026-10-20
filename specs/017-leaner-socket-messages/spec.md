# Feature Specification: Leaner Socket Messages

**Feature Branch**: `017-leaner-socket-messages`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "R24. Leaner socket messages (docs/roadmap.md): send much less data over the live connection per change. Measure the payload size per event over a full game (2 and 8 players, with spectators) as a baseline; apply the quick wins (the game log and the seat identities are no longer repeated with every state update, only sent when a client joins, rejoins, starts watching, reloads, or the seats change); evaluate and, if the measurements justify it, compress the transport; re-measure afterwards. The larger diff step is out of scope unless the measurements show it is worth it; record that decision. Reconnects, rematches and spectators must always get a complete snapshot."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Measure the baseline and the result (Priority: P1)

The maintainer wants to know how much data a game really sends, before and after the change, so that every optimisation is justified by numbers and not by guesses. A repeatable measurement reports the payload size per event type over a complete game, for a small game (2 players) and a large one (8 players), each with and without spectators.

**Why this priority**: The roadmap marks the real payload sizes as open. Without a baseline neither the quick wins nor the compression and diff decisions can be judged.

**Independent Test**: Run the measurement on the unchanged game: it prints the size per event type and the total per client over a full game for each scenario. Run it again after the change and compare.

**Acceptance Scenarios**:

1. **Given** the game before any optimisation, **When** the measurement runs a full game with 2 players, **Then** it reports the size per event type, the total per client and how the size of the state update develops over the game.
2. **Given** the same measurement with 8 players and spectators, **When** it finishes, **Then** the report covers players and spectators separately.
3. **Given** the optimised game, **When** the measurement runs again with the same scenarios, **Then** the results are directly comparable with the baseline and are recorded together with it.

---

### User Story 2 - Constant-size updates during a game (Priority: P1)

During a game, every accepted action (throw, secure dice, bank, timer expiry, computer move) sends an update to every player and spectator. Today each update repeats the whole game log and all seat names, so updates grow as the game goes on. After the change, an update carries only what changed in the turn; the log arrives as new entries only, and the seat names are not repeated. Players on slow or mobile connections notice no growth in lag late in a long game, and the table looks and behaves exactly as before.

**Why this priority**: This is the core value and the main source of waste found in playtests.

**Independent Test**: Play a long game with 8 players and compare the size of an update early and late in the game: they are about the same. The table, the log and all seat names look exactly as they did before the change.

**Acceptance Scenarios**:

1. **Given** a running game with a long log, **When** any player acts, **Then** the update sent to every client does not contain the already-delivered log and its size does not depend on the log length.
2. **Given** a running game, **When** a player acts, **Then** every client still shows the new log entries once, in order, without duplicates or gaps.
3. **Given** a running game, **When** an update is sent for a normal turn, **Then** it does not repeat nicknames, computer names or host information that did not change.
4. **Given** a running game, **When** seats change (a player joins, leaves, is replaced, the host changes), **Then** all clients show the changed identities immediately.

---

### User Story 3 - Complete picture after joining, reconnecting or reloading (Priority: P1)

Whoever enters a game in the middle - a player who rejoins, a player whose connection dropped and came back, a visitor who starts watching, or anyone who reloads the page - sees the full game at once: every seat with its name, the whole log so far, the scores and the current action. The same applies to everybody after a rematch in the same room. Nobody sees an empty log, missing names or a half-updated table, and nobody has to do anything to repair it.

**Why this priority**: Sending less is only acceptable if nobody ever ends up with an incomplete view. The existing flows for rejoin, spectators and rematch must keep working unchanged.

**Independent Test**: In a running game with a long log, rejoin as a player, reload the page, start watching as a spectator and trigger a rematch: each time the client shows all names, the full log and the current state, and then continues to follow the game live.

**Acceptance Scenarios**:

1. **Given** a running game with a long log, **When** a player reloads the page and rejoins, **Then** they see all seat names, the complete log and the current state.
2. **Given** a running game, **When** a visitor starts watching, **Then** they see all seat names, the complete log and the current state, and then follow later actions live.
3. **Given** a player whose connection dropped during several actions, **When** the connection returns, **Then** they see the complete current state including the entries logged in the meantime, with no gap or duplicates.
4. **Given** a finished game, **When** the host starts a rematch in the same room, **Then** all clients, including spectators, receive a complete fresh view with the new log.
5. **Given** a client that missed an update and notices that its log or seats no longer fit the game, **When** the next update arrives, **Then** it recovers a complete view on its own, without a manual reload.

---

### User Story 4 - Smaller transfer on the wire (Priority: P2)

If the measurements show that the data on the wire is still larger than necessary after the quick wins, the connection compresses its messages so that the remaining volume shrinks further, without any visible effect for players. If the measurements show no meaningful gain, or a cost that outweighs it (for example server load), no compression is enabled, and that decision is recorded with the numbers.

**Why this priority**: Possible additional saving, but only worth doing if the numbers say so; the roadmap explicitly asks to measure before choosing.

**Independent Test**: Compare the measurement after the quick wins with and without compression, and verify that the decision (enabled or not) is documented with the figures, and that the game works the same either way.

**Acceptance Scenarios**:

1. **Given** the post-quick-win measurement, **When** the compression is evaluated, **Then** the result (size saved, server cost) and the decision are recorded in the project documentation.
2. **Given** compression is enabled, **When** a full game is played with players and spectators, **Then** play behaves exactly as without it, including behind the production reverse proxy.

---

### User Story 5 - Decide on the larger step (Priority: P3)

The maintainer decides, based on the measurements after the quick wins, whether sending only per-field changes (versioned diffs) is worth its complexity. The decision and the figures are recorded, and the roadmap is updated. The diff mechanism itself is built only if the numbers clearly justify it; otherwise it stays an open idea.

**Why this priority**: Guards against building a complex mechanism that the data does not justify; follows the project principle of simplicity.

**Independent Test**: The documentation contains the post-quick-win figures, the decision for or against the diff step and the reason.

**Acceptance Scenarios**:

1. **Given** the final measurements, **When** the feature is finished, **Then** the roadmap states whether the diff step is dropped, postponed or planned as a separate item, with the supporting figures.

---

### Edge Cases

- A client has the old version of the app open while the server is updated: the existing update/version handling applies, and no client is left showing a broken or empty game.
- A client receives log entries that do not continue directly after the ones it has (it missed a message): it requests or receives a complete log and ends up with a consistent view.
- The log reaches its maximum length and the oldest entries are dropped: clients that joined earlier and clients that joined later agree on the latest entries and see no duplicates.
- A rematch begins while spectators are watching: spectators get the fresh view without rejoining.
- A seat is taken over by a computer player, or a player leaves, during a running game: the identity change reaches everybody, including spectators.
- A spectator joins or leaves: still only the counter changes for the others (spec 016 behaviour is unchanged).
- Two quick actions follow each other: clients show them in order, with no flicker back to an older state.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The project MUST provide a repeatable way to measure the size of every event type sent to clients over a complete game, for at least a 2-player and an 8-player game, each with spectators, reporting players and spectators separately.
- **FR-002**: A baseline measurement of the unchanged behaviour MUST be recorded before any optimisation, and the same scenarios MUST be re-measured afterwards; both results are recorded in the project documentation.
- **FR-003**: Ordinary game updates MUST NOT contain the game log; the log MUST reach each client exactly once, as new entries in order.
- **FR-004**: The complete log MUST be delivered to a client when it joins, rejoins, starts watching, reloads, reconnects after a gap, and to everyone after a rematch.
- **FR-005**: Ordinary game updates MUST NOT repeat seat identities (nicknames, computer names, host marker); identities MUST be sent on join, rejoin, start of watching, reload, every seat change (including host handover and computer takeover) and rematch.
- **FR-006**: The size of an ordinary game update MUST NOT grow with the number of log entries or with the length of the game.
- **FR-007**: A client that receives data that does not fit its current view (for example log entries with a gap, or an update for seats it does not know) MUST recover a complete view automatically.
- **FR-008**: Reconnecting players, rejoining players, spectators and all clients after a rematch MUST always receive a complete snapshot; none of these flows may depend on a prior state held by the client.
- **FR-009**: Players and spectators MUST see exactly the same table, log, names and counters as before the change; no visible behaviour changes, and the spectator-counter rules of spec 016 stay unchanged.
- **FR-010**: The view shown to the user MUST still be built in a single place on the client from the data received, so that full snapshots and incremental updates cannot produce diverging views.
- **FR-011**: The protocol version MUST be raised so that clients and server of different generations are never mixed silently; the existing update handling covers outdated clients.
- **FR-012**: The effect of transport compression MUST be evaluated against the measurements; it MUST only be enabled if the gain justifies the server cost and it works through the production reverse proxy. The decision and its figures MUST be recorded either way.
- **FR-013**: Static game data (rules, card names, texts) MUST NOT be sent; only identifiers are.
- **FR-014**: The decision on the larger diff step MUST be made from the post-quick-win measurements and recorded in the roadmap; the diff mechanism is out of scope for this feature.
- **FR-015**: Automated tests MUST cover the complete-snapshot paths (rejoin, reconnect after missed updates, spectator start, rematch) and the absence of the log and unchanged identities in ordinary updates.

### Key Entities

- **Game update**: the message sent to every participant after an accepted action; carries the changes of a turn (current seat, phase, dice, selection, piles, scores, timers), but not the log or seat identities.
- **Snapshot**: the complete view of a game for one participant (all seats with identities, the whole log so far, scores, current action); sent on entering, re-entering, recovering and after a rematch.
- **Log entries**: the ordered, length-limited record of what happened in the game; delivered as a complete list in a snapshot and as new entries afterwards.
- **Seat identity**: nickname or computer name of a seat and the host marker; changes rarely.
- **Measurement report**: size per event type and total per participant for a scenario (player count, with or without spectators), before and after the change.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a full 8-player game, the size of a game update late in the game (log at its maximum) is within 10% of the size of an update early in the game.
- **SC-002**: The total data sent per player over a complete 8-player game is at least 70% lower than the recorded baseline; the figure reached is recorded.
- **SC-003**: The total data sent per spectator over the same game is reduced by at least as much as for players.
- **SC-004**: In 100% of the tested entry paths (rejoin, reload, reconnect after missed updates, spectator start, rematch), the client shows a complete game (all names, complete log, current state) without manual action.
- **SC-005**: No visible difference for players: the existing end-to-end flows and spectator flows pass unchanged.
- **SC-006**: The baseline, the post-change measurements, the compression decision and the decision about the diff step are all documented with figures.

## Assumptions

- The goal is less data per change, not fewer changes; the number of events per action stays as it is.
- The existing separate delivery of new log entries stays the single source for the log after the snapshot; the cursor that tells a client where its log ends stays in place.
- A reduction target of 70% for the quick wins is derived from the roadmap's observation that the log and the seat names make up most of every message; the measurement may adjust the figure, and the final figure is recorded.
- Which compression option (transport compression or a binary encoding) is better is decided from the measurements; the spec only requires that the decision is made and recorded. Shortened field names are not part of this feature.
- Games are played with at most 8 players and a modest number of spectators, as in spec 016.
- Persistence, save/load and replay are out of scope; this feature only shares the "complete snapshot" idea with them.
- The measurement tool is a development aid, not a user-facing feature.
