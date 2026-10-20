# Feature Specification: Finer Socket Diffs and Compact Log

**Feature Branch**: `017-leaner-socket-messages` (the spec lives in this branch; no separate branch)

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Reduce the socket traffic further after spec 017, based on a recorded 4-player round. A change repeats the whole `game` part (all players with names and scores, the complete turn with default values) although usually one or two values changed: send only the differences. Make log entries more compact. Do not send a value that is cleared and set again by the same change, and do not resend the whole `you` part for one flag. Later stage: shorter message keys from one shared table. CSV-formatted strings are rejected. Measure again and record the figures; raise the protocol version."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A turn message carries only what changed (Priority: P1)

During a game, every change reaches players and spectators as a message that contains only the values that really changed in the game: a new score of one player, the new current player, the new number of cards in the draw pile, the turn fields that differ. Today every message repeats all players with their names and scores and the whole turn, including fields that are empty or zero, so a single card draw costs about 700 bytes although only a few values differ. Players and spectators see exactly the same table as before.

**Why this priority**: In the recorded 4-player round the game part makes up most of every message. This is the main remaining waste after spec 017.

**Independent Test**: Play a 4-player round and record the messages: a card draw carries the drawn card and the new pile size but no player names, no scores and no unchanged turn fields. The table, scores and turn display match a game played before the change.

**Acceptance Scenarios**:

1. **Given** a running game, **When** a card is drawn, **Then** the message contains the new card, the new pile size and the log entry, and no player name or score.
2. **Given** a running game, **When** a player banks points, **Then** the message names only that player's new score and the turn values that changed.
3. **Given** a turn that ends, **When** the next player is up, **Then** one message carries the new current player and the reset turn values without repeating unchanged values.
4. **Given** the game ends, **When** the result is known, **Then** the message carries the result, and clients show the same game-over modal as before.
5. **Given** any sequence of changes, **When** a client applies them to its snapshot, **Then** its table equals the table of a client that received a fresh snapshot at that moment.

---

### User Story 2 - A compact log (Priority: P1)

Log entries become smaller without changing what the log shows. Entries created by one action share one time stamp instead of repeating it, the nested type field is flattened, and entries that clients can derive from other values are not sent as extra entries. The log looks exactly as before in every language.

**Why this priority**: After the game part, the log entries are the next largest part of a turn message; a turn that ends carries three or more entries.

**Independent Test**: Compare the displayed log of a full game before and after: identical text. Compare the size of the log part of a turn that busts: clearly smaller.

**Acceptance Scenarios**:

1. **Given** a bust, **When** the entries are sent, **Then** the time stamp is sent once for them and the log shows the same lines as before.
2. **Given** a snapshot with a long log, **When** the client shows it, **Then** it equals the log built from the changes.
3. **Given** the log is trimmed at its maximum length, **When** clients that joined at different times compare it, **Then** they agree on the entries.

---

### User Story 3 - No redundant values in a change (Priority: P2)

A change does not send a value only to clear it, nor clear it and set it in one go: when the turn deadline moves from one player to the next, one value is sent, not a clearing followed by a new deadline. A flag inside the player's own data (for example the timeout warning) is sent alone and not together with the player id and seat that did not change. Messages that carry no information for a recipient are not sent.

**Why this priority**: Small but frequent savings that are cheap once the differences are computed per field.

**Independent Test**: Record a turn change with timers: the deadline appears once. Trigger a timeout warning: the message contains only the warning flag.

**Acceptance Scenarios**:

1. **Given** a turn change, **When** the next human is up, **Then** the message contains the new deadline and no separate clearing of the old one.
2. **Given** a timeout warning, **When** it appears or disappears, **Then** the message contains only that flag.
3. **Given** a change that does not concern a recipient, **When** the room changes, **Then** that recipient gets no message and keeps its running number.

---

### User Story 4 - Shorter message keys (Priority: P3)

The keys of the messages are shortened (for example `playerId` becomes `pid`, `seats` becomes `s`) from one table that frontend and backend share, so nobody abbreviates by hand and the two sides cannot disagree. This is a separate stage that is only built after the measurement of the first three stories, and only if the remaining saving justifies the lower readability of the traffic in the browser tools.

**Why this priority**: The saving is real but smaller than the structural changes, and it makes the traffic harder to read. It comes last and is decided from numbers.

**Independent Test**: Both sides use the same table: a key added in one place is available on the other side; a test fails when a key is missing in the table or used twice within one object.

**Acceptance Scenarios**:

1. **Given** the shared table, **When** a message is sent and received, **Then** the receiving side shows the same data as before the shortening.
2. **Given** a new field, **When** it is added without a table entry, **Then** the build or the tests fail.
3. **Given** the measurement after stories 1 to 3, **When** the saving of the short keys is small, **Then** the story is dropped and the decision is recorded.

---

### User Story 5 - Measure again and record the decision (Priority: P1)

The existing measurement reports the new figures next to the figures of specs 011 and 017. The documentation states the figures, what each story saved, and the decisions: CSV-formatted strings are rejected (escaping of names, lost types, little gain for the frequent messages); the host receiving its own change and the Engine.IO heartbeat stay as they are.

**Why this priority**: Every optimisation must be justified by numbers, like in spec 017.

**Independent Test**: Run the measurement: it prints the same scenarios as before, and the documentation shows the comparison and the decisions.

**Acceptance Scenarios**:

1. **Given** the finished feature, **When** the measurement runs, **Then** the figures per scenario are comparable with the baseline of spec 017 and are recorded.
2. **Given** the documentation, **When** a maintainer reads it, **Then** it states for CSV strings, compression and binary encoding whether they are dropped, postponed or planned, with the reason.

---

### Edge Cases

- A client misses a message: gap detection and the request for a snapshot of spec 017 keep working unchanged; the snapshot is complete.
- A client has an outdated version after the server update: the existing version handling applies and nobody is left with a broken table.
- A change affects the number of players or the rules (rematch, new round): a complete snapshot is sent instead of a difference, as today.
- A player is renamed, replaced by a computer, or leaves: the changed name reaches everybody; names are not repeated otherwise.
- Two changes follow each other quickly (draw and throw): applied in order, no flicker to an older state.
- The log reaches its maximum length: entries are trimmed the same way for everybody.
- Spectators receive the same differences as players, except for what they may not see.
- A game with only computers: the timer and warning values are not sent.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A change MUST contain only the parts of the game state that differ from what the recipient has; unchanged player names, scores and turn values MUST NOT be repeated.
- **FR-002**: Player scores MUST be sent only for the players whose score changed, identified by position.
- **FR-003**: Turn values that are empty or at their start value MUST NOT be sent as separate values when the recipient can derive them from the state change.
- **FR-004**: Applying the changes to a snapshot MUST give the same state as a snapshot taken at that moment; this MUST be tested for sequences of real games.
- **FR-005**: Log entries created by one action MUST share one time stamp in the message; the log MUST show the same lines in the same order as before.
- **FR-006**: Log entries that the client can derive from other values MUST NOT be sent as separate entries, unless this changes what the log shows.
- **FR-007**: A clearing of the turn deadline MUST NOT be sent together with, or directly before, the new deadline.
- **FR-008**: A change of one flag of the recipient's own data MUST send only that flag.
- **FR-009**: The running number, gap detection, snapshot request and rate limit of spec 017 MUST stay unchanged.
- **FR-010**: The user MUST see the same table, log, scores and counters as before; no visible behaviour changes.
- **FR-011**: The view shown to the user MUST still be built in one place on the client, from the snapshot and the changes.
- **FR-012**: If the shortened keys are built, they MUST come from one table shared by frontend and backend, and a field without an entry MUST fail the build or the tests.
- **FR-013**: The measurement of spec 017 MUST run unchanged and its figures MUST be recorded together with the earlier baselines.
- **FR-014**: The protocol version MUST be raised to 13 so that old and new clients are never mixed silently.
- **FR-015**: CSV-formatted strings, compression and binary encoding MUST NOT be part of this feature; the decision on each MUST be recorded.
- **FR-016**: Automated tests MUST cover the differences of every change type (draw, throw, select, bank, bust, timeout, seat change, game end, rematch), the equality with a fresh snapshot, and the log display.

### Key Entities

- **Game difference**: the part of a change that describes what is different in the game state (scores by position, current player, turn values, pile size, result).
- **Compact log entry**: a log entry in the smaller form, with the time stamp shared per action; it shows the same line as before.
- **Key table** (only if built): the one shared list of full and short key names.
- **Measurement report**: size per event and per person over a game, compared with the earlier figures.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A card draw message in a 4-player game is at least 60% smaller than before (about 700 bytes in the recorded round).
- **SC-002**: The total data per player over a full 8-player game is at least 50% lower than the figure of spec 017 (0.37 MB); the figure reached is recorded.
- **SC-003**: The same reduction applies to spectators.
- **SC-004**: In 100% of the tested game sequences the table of a client that applied the differences equals the table after a fresh snapshot.
- **SC-005**: The log of a game looks identical before and after, in English and German.
- **SC-006**: The existing player, spectator and end-to-end flows pass without changes.
- **SC-007**: The figures, the savings per story and the decisions are documented.

## Assumptions

- The recorded round in `tmp/socket-traffic-single-round` is representative; the measurement of spec 017 gives the final figures and may adjust the targets, which are then recorded.
- The saving of the short keys (story 4) is measured after stories 1 to 3; if it is small, the story is dropped.
- The host keeps receiving its own change like any other client (the client has no optimistic state); this is not changed.
- The Engine.IO heartbeat (one byte every 25 seconds) is not changed.
- Event names and message formats are decided in the plan; this spec fixes the behaviour.
- The game engine and the rules do not change; only what is sent and how it is applied.
