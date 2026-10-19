# Feature Specification: Rematch in the Same Room

**Feature Branch**: `014-rematch-same-room`

**Created**: 2026-10-19

**Status**: Draft

**Design**: [design.md](design.md)

**Input**: User description: "Implement roadmap item R7. After a game ends, the host clicks 'Rematch' in the game-over modal. The same room (game id, password, seats, computers with skill, risk and speed, host settings) goes from finished back to the lobby immediately and the host sits in the lobby right away. The other humans still in the game-over modal get a 'Rejoin' button (disabled with 'waiting for host' until the host decided) that re-seats them on their previous seat; the seat stays reserved until the host starts. 'Back to the lobby' stays for everybody who does not want to continue. Seating order is kept. Players who left the finished game before the rematch get no Rejoin. A rematch must not be confused with the identical finished game: stale rejoin or reconnect requests of the finished round are rejected without side effects. New protocol events and a protocol version bump are accepted."

## Scope

In scope: a "Rematch" action for the host in the game-over modal; reopening the finished room as a lobby with unchanged settings, computers and seat order; a "Rejoin" action for the other humans still in the modal, including the waiting state before the host decided; seat reservation until the game starts; losing the seat when not rejoined by the start; the host removing waiting players; rejecting stale requests that refer to the finished round; the matching protocol change; English and German texts, user documentation and roadmap update.

Out of scope: the starting-player draw and shuffling of the seating order (R17), remembered lobby form values and presets (R10, not a dependency), rule options per game (R9), spectators (R8), saving or replaying finished games (R4, R13, R15), any change to game rules, scoring or computer behaviour.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - The host starts a rematch with one click (Priority: P1)

A game has ended and the game-over modal is open. The host clicks "Rematch". The room immediately turns back into a lobby: same game, same password, same seats, same computers (skill, risk, speed) and same host settings. The host is in the lobby straight away and does not wait for anybody. All "Ready" marks are cleared, and the host can start the next game as usual once everyone who wants to play is ready.

**Why this priority**: This is the core of the feature: replacing the "everybody leaves and joins again" friction with one click.

**Independent Test**: Finish a game with the host, one other human and one computer. The host clicks "Rematch": the host sees the lobby with the same two humans' seats, the computer with the same settings, the same game name and password, and no one marked ready.

**Acceptance Scenarios**:

1. **Given** a finished game and the modal is open, **When** the host clicks "Rematch", **Then** the room is a lobby again and the host sees it without further navigation.
2. **Given** the rematch lobby, **When** it is shown, **Then** the game name, password, number of seats, computer seats (skill, risk, speed), computer speed setting and other host settings are exactly those of the finished game.
3. **Given** the rematch lobby, **When** it is shown, **Then** the seating order is the one of the finished game and nobody is marked ready.
4. **Given** the rematch lobby, **When** the host starts the game once the usual start conditions are met, **Then** a new game starts with fresh scores and a fresh deck, and no state of the finished game carries over.
5. **Given** the host has not clicked "Rematch", **When** the host leaves the modal with "Back to the lobby", **Then** there is no rematch and the room behaves as before this feature.

---

### User Story 2 - The other players rejoin their seat (Priority: P1)

Other humans who are still looking at the game-over modal see a "Rejoin" button next to "Back to the lobby". As long as the host has not decided, the button is disabled and says that the player is waiting for the host. When the host clicks "Rematch", it becomes active. Clicking it puts the player back on their previous seat in the lobby. They then press "Ready" like in any lobby. The seat stays reserved for them until the host starts the game.

**Why this priority**: Without a way back in, the rematch would only work for the host.

**Independent Test**: With two humans in the modal, the second sees a disabled "Rejoin" that becomes active after the host's "Rematch". Clicking it shows the lobby with the player on the same seat and the same name. Before the click, the host sees that seat as reserved for that player.

**Acceptance Scenarios**:

1. **Given** a finished game and the host has not decided, **When** another human looks at the modal, **Then** "Rejoin" is visible but disabled with a "waiting for host" hint, and "Back to the lobby" works as before.
2. **Given** the host clicked "Rematch", **When** another human still has the modal open, **Then** their "Rejoin" becomes active without reload.
3. **Given** "Rejoin" is active, **When** the player clicks it, **Then** they are in the rematch lobby on their previous seat, not ready.
4. **Given** the rematch lobby, **When** a human has not yet rejoined, **Then** their seat is shown as reserved for them (not open to other joiners) and the host sees who is still missing.
5. **Given** the host clicked "Rematch", **When** a human clicks "Back to the lobby" instead, **Then** they leave and their seat is freed.
6. **Given** the rematch lobby, **When** a player rejoined, **Then** they can mark themselves ready and the host's start rule is the same as for a normal lobby.

---

### User Story 3 - The host starts without waiting for everybody (Priority: P1)

Not everybody comes back. The host can start the next game as soon as the usual start conditions are met. Humans who have not rejoined by then lose their reserved seat, and the game starts with fewer players. The host can also remove waiting players from the lobby earlier. The minimum of two players, computers included, still applies.

**Why this priority**: A single absent player must not block a rematch, which is the reason for choosing "host first" over "everybody confirms first".

**Independent Test**: Three humans finish a game. The host rematches, only one other human rejoins. The host starts: the game runs with the host and that human, and the third player's seat is gone.

**Acceptance Scenarios**:

1. **Given** a rematch lobby with a reserved seat of a human who did not rejoin, **When** the host starts the game, **Then** the game starts without that player and the seat is gone from the game.
2. **Given** the rematch lobby, **When** the host removes a waiting player, **Then** the seat is freed immediately and that player's "Rejoin" is no longer possible.
3. **Given** removing or losing seats would leave fewer than two players, **When** the host tries to start, **Then** the start is refused with the usual message.
4. **Given** a player lost their seat by the start, **When** they still look at their old modal, **Then** they no longer see an active "Rejoin" but can only go back to the lobby.

---

### User Story 4 - A rematch is never confused with the finished game (Priority: P1)

Players who left the finished game before the host clicked "Rematch" (back to the lobby, reload, or lost connection and returned) get no "Rejoin" for the rematch: they are done with that game. Requests that still refer to the finished round, such as a late "Rejoin" from an old modal or a reconnect of a stale client, must not put anybody into the new round, restore an old table, or change the rematch lobby in any way. The rematch counts as a new round of the same room.

**Why this priority**: The same game id is reused. Without a clear boundary between rounds, stale requests could seat players wrongly or show a finished table again.

**Independent Test**: A player leaves via "Back to the lobby", the host rematches, and the player's old client sends a late rejoin: it is rejected, the player stays in the games list, and the rematch lobby is unchanged. A player who reloaded in the modal returns to the games list and can find the game again as an open lobby if there is a free seat.

**Acceptance Scenarios**:

1. **Given** a player left the finished game, **When** the host clicks "Rematch", **Then** that player is not re-seated and does not get a "Rejoin".
2. **Given** a rematch lobby, **When** a request arrives that was made for the finished round, **Then** it is rejected and nothing changes for anybody.
3. **Given** a player reloaded during the modal and the host rematches afterwards, **When** the player looks at the games list, **Then** the rematch lobby shows as an ordinary open game that they may join like any other (if a seat is free and the password is known), not as a rejoin.
4. **Given** a rematch is running as a lobby or game, **When** a stale client of the earlier round reconnects, **Then** it is not shown a finished table and does not influence the current round.
5. **Given** the host has already started the next game, **When** any request for the previous round arrives, **Then** it is rejected the same way.

---

### User Story 5 - Texts and documentation in both languages (Priority: P3)

All new texts (button labels, the "waiting for host" hint, reserved-seat markers, rejection messages) exist in English and German. The user documentation and the roadmap reflect the new behaviour.

**Why this priority**: Required for consistency, but no gameplay depends on it.

**Independent Test**: Switch the language to German and English and read all new texts; check the documentation and that R7 is marked done in the roadmap.

**Acceptance Scenarios**:

1. **Given** either language, **When** the new buttons and hints are shown, **Then** they appear fully translated.
2. **Given** the feature is done, **When** the roadmap is read, **Then** R7 is marked as delivered and the rules and user documentation describe the rematch.

### Edge Cases

- The host closes the tab or loses the connection while the modal is open and before clicking "Rematch": no rematch can happen; the room follows the existing rules for finished games and for host changes.
- The host disconnects right after "Rematch": the lobby follows the existing lobby rules (host takeover, cleanup when nobody is connected).
- A human who is still in the modal when the host starts the next game (never clicked "Rejoin"): the seat is lost, see User Story 3.
- Two players click "Rejoin" at the same moment: both succeed, since each seat is reserved for exactly one player.
- A player clicks "Rejoin" twice or after already rejoining: no effect and no error for the others.
- A computer took over a human's seat during the game after timeouts: that player has no seat to return to and gets no "Rejoin"; the seat is freed by the rematch like the seat of any player who left (see Assumptions).
- Every human but the host left before the rematch: the host gets a lobby with their own seat and the computers; they can start if the minimum of two players is met, otherwise they keep waiting for joiners like in any lobby.
- A rematch right after a game that ended with a Clover win, a target score win or any other end: no difference in behaviour.
- A rematch of a rematch: works the same, each rematch is a new round.
- The room list: during the rematch lobby the game appears like any other open lobby, with reserved seats not counted as joinable.
- Cleanup timers: a rematch lobby with nobody connected is cleaned up like any lobby; a finished game without a rematch is cleaned up as before.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The game-over modal MUST show a "Rematch" action to the host only.
- **FR-002**: When the host triggers the rematch, the same room MUST return from finished to lobby immediately, keeping game name, password, seat count, seat order, computer seats with skill, risk and speed, the computer speed setting and all other host settings.
- **FR-003**: Triggering a rematch MUST clear all "Ready" marks and discard all state of the finished game (scores, deck, results, turn data).
- **FR-004**: The host MUST be in the lobby right after triggering the rematch, without waiting for any other player.
- **FR-005**: Every other human still looking at the game-over modal MUST see a "Rejoin" action; it MUST be disabled with a "waiting for host" hint until the host has decided, and become active when the host triggers the rematch, without a page reload.
- **FR-006**: Rejoining MUST place the player back on their previous seat in the lobby, not ready.
- **FR-007**: A human's seat MUST stay reserved for them from the rematch until the host starts the game, the host removes them, or they leave.
- **FR-008**: Reserved seats MUST NOT be offered to other joiners, MUST be visible to the host as waiting for that player, and MUST NOT count as joinable in the games list.
- **FR-009**: The host MUST be able to remove a waiting player in the rematch lobby, which frees the seat at once.
- **FR-010**: When the host starts the game, seats of humans who have not rejoined MUST be dropped and the game MUST start with the remaining players; the usual minimum of two players (computers included) MUST still apply.
- **FR-011**: "Back to the lobby" MUST remain available to every player at all times, before and after the host's decision, and MUST free the leaving player's seat.
- **FR-012**: If the host leaves the modal without triggering a rematch, no rematch MUST be possible afterwards and the room MUST behave as it did before this feature.
- **FR-013**: Players who left the finished game before the rematch (by leaving, reload, or reconnecting later) MUST NOT be offered a "Rejoin" and MUST NOT be re-seated automatically.
- **FR-014**: The rematch MUST be a new round of the same room: each round MUST be distinguishable by the system, and every request that refers to a previous round MUST be rejected without any effect on the current round, including late "Rejoin" requests, reconnects of stale clients and game views of the finished round.
- **FR-015**: A stale client of an earlier round MUST NOT receive or display the finished table again after a rematch started, and MUST NOT be able to change seats, ready marks or settings of the current round.
- **FR-016**: Seat order MUST be kept; this feature MUST NOT shuffle seats or choose the starting player differently from today (R17 decides that later).
- **FR-017**: The protocol MUST carry the new rematch and rejoin actions and the round identification, and the protocol version MUST be raised so that outdated clients are told to update.
- **FR-018**: All new user-visible texts MUST exist in English and German.
- **FR-019**: The user documentation, the game rules documentation where relevant, and the roadmap MUST describe the rematch and mark R7 as delivered.

### Key Entities

- **Room round**: One game played in a room, from lobby to result. A rematch starts the next round in the same room. Requests and views carry the round they belong to.
- **Reserved seat**: A seat of a human from the finished round that is held for that player during the rematch lobby, until they rejoin, leave, are removed, or the game starts.
- **Rematch lobby**: The room in lobby state after the host triggered the rematch, with the previous settings, computers and seat order.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From the end of a game, the host reaches a ready-to-start lobby with all previous settings in one click and under 2 seconds, without re-entering any setting.
- **SC-002**: A returning player is back on their seat in at most two clicks from the game-over modal ("Rejoin", then "Ready").
- **SC-003**: In 100% of tested rematches, game name, password, seat order and computer settings equal those of the finished game.
- **SC-004**: A single absent player never blocks a rematch: the host can start as soon as the usual start conditions hold.
- **SC-005**: In 100% of tested cases, requests that refer to a previous round change nothing in the current round and show no old table.
- **SC-006**: No player who left the finished game is ever seated in the rematch without an explicit new join.

## Assumptions

- The host-first approach (the lobby opens right after the host's click, others follow) was chosen over waiting for every player's confirmation, because an absent player would block everyone.
- A reload or a reconnect after the game ended counts as leaving the finished game (existing behaviour of the game-over modal); such players join the rematch lobby like any other newcomer.
- A player whose seat was taken over by a computer during the game (after timeouts) has no seat of their own at the end and therefore gets no "Rejoin". Such a seat, like the seat of a player who left the finished game, is freed by the rematch; only computers the host set up keep their settings.
- The rematch lobby uses the existing lobby rules for starting, ready marks, host changes, removal of players and cleanup; this feature adds no new timers.
- The game name, password and settings are not changed by a rematch; adjusting them afterwards uses the existing lobby controls.
- No new limits on the number of rematches in a row.
- The remembered lobby form values and presets (R10) are independent and not required.
