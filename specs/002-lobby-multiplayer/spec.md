# Feature Specification: Lobby and Multiplayer

**Feature Branch**: `002-lobby-multiplayer`

**Created**: 2026-10-15

**Status**: Draft
**Design**: [design.md](design.md) (mockup: [mockup.html](mockup.html))

**Input**: User description: "Feature 002: Lobby and multiplayer via WebSocket. Anonymous sessions, password-protected games with rules set at creation, main lobby (2-8 players), game lobby with seats and Ready, host role, leave/disconnect handling with reconnect grace period, server-authoritative dice, turn flow (select, throw, bank). Computer players that play on their own with selectable difficulty. Out of scope: strategy calibration by simulation, dice UI/animation, save/load, PWA, game log table, Docker, accounts."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create and join a password-protected game (Priority: P1)

A person opens the app, enters a nickname and becomes an anonymous player. They create a game, choose a password, the number of seats (2-8) and the rules (target score, minimum points, four-of-a-kind doubling, card counts per type; defaults from [rules.md](../../docs/rules.md)). They become the host. Other players enter a nickname, see the open games, and join by entering the password.

**Why this priority**: Without creating and joining games there is no multiplayer; this is the entry point of every other story.

**Independent Test**: Two browsers create and join a game; a wrong password is refused, the correct one admits the second player, and both see each other in the game lobby.

**Acceptance Scenarios**:

1. **Given** a player with a nickname, **When** they create a game with a password and 4 seats, **Then** the game appears in the main lobby and the creator is host in the game lobby.
2. **Given** an open game, **When** a player enters the wrong password, **Then** they are refused and not shown the game lobby.
3. **Given** an open game, **When** a player enters the correct password, **Then** they take a free seat and all players in the game lobby see them appear.
4. **Given** a player who repeatedly enters wrong passwords, **When** the attempt limit is exceeded, **Then** further attempts are refused for a cooling-off period, even with the correct password.
5. **Given** a game whose seats are all taken, **When** another player tries to join, **Then** they are refused with a "game is full" message.
6. **Given** a returning player in the same browser, **When** they open the app, **Then** their previous nickname and session are restored without re-entering a password for a game they already sit in.

---

### User Story 2 - Prepare the game in the game lobby and start it (Priority: P1)

In the game lobby, seats beyond the chosen player count are shown locked (padlock). The host can lock or enable seats and switch a seat between human and computer. A computer has a difficulty (easy, medium, hard) or "random", which stays hidden from the other players. Every human presses "Ready"; only when all humans are ready can the host start the game.

**Why this priority**: Starting a game is required before any turn can be played.

**Independent Test**: With three players in a lobby, the host cannot start until all humans are ready; after the last Ready, the host starts the game and all players switch to the running game.

**Acceptance Scenarios**:

1. **Given** a game lobby with 4 of 8 seats chosen, **When** players look at the seats, **Then** the unchosen seats are locked.
2. **Given** the host in the game lobby, **When** they lock or enable a seat, **Then** all players see the change immediately.
3. **Given** a game lobby, **When** at least one human is not ready, **Then** the host cannot start the game.
4. **Given** all humans are ready, **When** the host starts, **Then** the game begins with the seated players in a defined turn order.
5. **Given** a seated human who is ready, **When** the host changes the seat setup, **Then** readiness handling stays consistent (a human whose seat changed must confirm again).
6. **Given** fewer than 2 occupied seats, **When** the host tries to start, **Then** the start is refused.

---

### User Story 3 - Play turns online (Priority: P1)

The active player throws the dice, selects scoring dice, and either throws the rest again or banks. Dice and cards are decided by the server only; all players see every throw, selection, card draw and score change in real time. Inputs from a non-active player or against the rules are rejected. The game ends at the target score or with a Clover, and everyone sees the final ranking.

**Why this priority**: This is the actual game; it is the reason for the lobby.

**Independent Test**: Two players play a full game to the target score; every turn follows rules.md, both clients always show the same state, and out-of-turn or illegal actions change nothing.

**Acceptance Scenarios**:

1. **Given** it is player A's turn, **When** A throws, **Then** the server produces the dice and all players receive the same result.
2. **Given** a throw, **When** A selects scoring dice and banks, **Then** the score is updated for all and the turn passes on per the rules.
3. **Given** it is player A's turn, **When** player B sends a throw, select or bank, **Then** the action is rejected and the state is unchanged.
4. **Given** A selects non-scoring dice or banks below the minimum, **When** the action reaches the server, **Then** it is rejected with a stable reason that the client can show.
5. **Given** a bust, **When** the throw is resolved, **Then** all players see the lost turn and the next player is up.
6. **Given** a player reaches the target score or wins by Clover, **When** the turn is resolved, **Then** the game ends and all see the ranking (equal scores share a rank).

---

### User Story 4 - Handle players who leave or disconnect (Priority: P2)

When a player's connection drops or they leave, everyone is warned and an entry is added to the event log. A dropped player may reconnect within a grace period (60 s) and continue seamlessly. After the grace period the host decides: replace the seat with a computer or free the seat. The game waits for that decision on the missing player's turn.

**Why this priority**: Online games with up to 8 people will see disconnects; but a stable game without it still works for short sessions.

**Independent Test**: Close a player's tab mid-game; others see a warning; reopening within 60 s restores that player's seat and turn; waiting past 60 s presents the host with the two options.

**Acceptance Scenarios**:

1. **Given** a running game, **When** a player disconnects, **Then** all others are warned and a log entry is added.
2. **Given** a disconnected player, **When** they reconnect within 60 s, **Then** they regain their seat, role and current state and the warning is cleared.
3. **Given** a disconnected player, **When** 60 s pass, **Then** the host is asked to put in a computer or free the seat.
4. **Given** it is the disconnected player's turn, **When** the grace period runs out, **Then** the game pauses until the host decides.
5. **Given** the host themself disconnects, **When** the grace period runs out, **Then** host rights pass to another human player, who then makes the decision.
6. **Given** a player who leaves deliberately, **When** they confirm leaving, **Then** the same warning and host decision flow applies, without waiting for the grace period.

---

### Edge Cases

- Two clients use the same session token at once: the newest connection takes over, the older one is told it was replaced.
- A nickname is already used in the same game: the join is refused or the player is asked for another nickname.
- A nickname is empty, too long, or contains only whitespace/control characters: refused.
- A player joins while the game is already running: refused for new humans; only reconnection by an already seated session is possible.
- Host locks a seat that is occupied by a human: the human is removed from the seat with a visible notice (or the lock is refused; see Assumptions).
- All humans disconnect: the game stays paused and is cleaned up after an idle timeout.
- The server restarts: running games are out of scope here (save/load is a later feature), so the games are gone; clients get a clear message.
- Network flaps repeatedly: each reconnect within the grace period restores the seat; the grace period restarts per disconnect.
- Actions arrive twice (double click, retransmission): the second one is rejected or ignored without corrupting the state.
- A computer takes a seat that a human left mid-game: it continues with that player's score and plays from the next turn on.

## Requirements _(mandatory)_

### Functional Requirements

**Sessions and identity**

- **FR-001**: The system MUST let a visitor become an anonymous player by entering a nickname; the server issues a secret token that the client keeps to identify the player on reconnect.
- **FR-002**: The system MUST validate nicknames (length, allowed characters, unique within a game).
- **FR-003**: The system MUST NOT log or expose tokens or passwords to other players.

**Main lobby and game creation**

- **FR-004**: The system MUST show open (not started) games in the main lobby with name, host, seat usage and whether they are password protected.
- **FR-005**: Creating a game MUST require a password and let the creator choose the number of seats (2-8) and the rules from rules.md (target score, minimum points, four-of-a-kind doubling, card count per type, with defaults).
- **FR-006**: Game passwords MUST be stored only in hashed form.
- **FR-007**: Joining MUST require the correct password; failed attempts MUST be rate-limited per client and game.
- **FR-008**: The creator MUST become the host; the rules MUST be fixed once the game is created.

**Game lobby**

- **FR-009**: The game lobby MUST show all seats with status (human, computer, empty, locked) and all players' readiness, updated in real time for everyone.
- **FR-010**: Seats beyond the chosen player count MUST be locked at creation.
- **FR-011**: The host MUST be able to lock and enable seats and to switch a seat between human and computer at any time before the start, and choose the computer's difficulty (easy, medium, hard, or random).
- **FR-012**: Every human player MUST be able to mark themselves ready and revert it.
- **FR-013**: The host MUST be able to start the game only when at least 2 seats are occupied and all humans are ready.

**Computer players**

- **FR-025**: A computer seat MUST play its turns on its own through the same intents and validation as a human; it can never act out of turn or illegally.
- **FR-026**: A computer MUST have a difficulty (easy, medium, hard) that determines how much risk it takes (when it banks, which dice it keeps), or "random", where the level is picked at random and stays hidden from the other players.
- **FR-027**: Computer turns MUST be paced with short artificial pauses so humans can follow each step; the pause is the only delay and never blocks other games.

**Game flow**

- **FR-014**: Dice and card draws MUST be produced exclusively by the server using a cryptographically secure source, and applied through the rules engine in `libs/game-rules`.
- **FR-015**: Clients MUST only send intents (throw, select dice, bank, and the other player actions the rules engine offers); the server MUST validate every intent against the current turn and the rules and reject everything else with a stable reason.
- **FR-016**: After each accepted action, all players in the game MUST receive the new game state (without hidden information such as the deck order) within the same moment.
- **FR-017**: Only the active player MAY act in a turn; actions from others MUST be rejected without changing state.
- **FR-018**: The system MUST end the game at the target score or by Clover and show all players the final ranking.

**Leaving and reconnecting**

- **FR-019**: When a player disconnects or leaves, the system MUST warn all remaining players and add an entry to the game's event log.
- **FR-020**: A disconnected player MUST be able to reconnect within a 60 s grace period and regain seat, role and state.
- **FR-021**: After the grace period, or when a player leaves deliberately, the host MUST be offered to replace the seat with a computer or to free the seat; a game waiting for a decision on that player's turn MUST pause.
- **FR-022**: If the host is the one who left, host rights MUST pass to another human player.
- **FR-023**: One session token MUST be active on one connection at a time.

**Event log**

- **FR-024**: The system MUST keep an in-memory event log per running game (joins, leaves, disconnects, reconnects, host decisions, turns, results) visible to the players.

### Key Entities

- **Player session**: an anonymous identity with a nickname and a secret token; may belong to at most one game at a time.
- **Game room**: a game before and during play; has a password (hashed), fixed rules, seats, a host, a status (lobby, running, finished) and an event log.
- **Seat**: a position in a game room; states are empty, human, computer (with difficulty) or locked; holds readiness for humans.
- **Rules configuration**: the configurable rules from rules.md chosen at creation.
- **Game state**: the state produced by the rules engine; authoritative on the server.
- **Event log entry**: a time-stamped message about something that happened in a game.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new player can create a game or join one with a password in under 1 minute, without any instructions.
- **SC-002**: With 8 players in one game, every action is visible to all players within 1 second under normal network conditions.
- **SC-003**: 100% of illegal or out-of-turn actions, in automated tests, leave the game state unchanged and return a reason.
- **SC-004**: A player who reconnects within the grace period resumes at the exact state of the game in 100% of tested cases.
- **SC-005**: A full game from lobby to ranking can be played by 2 and by 8 simulated players without a rules or state divergence between clients.
- **SC-006**: Wrong password attempts beyond the limit are refused in 100% of tested cases, and no password or token appears in any log output.
- **SC-007**: Several games can run at the same time without any influence on each other.

## Assumptions

- Release 1 has no accounts; a nickname plus token is the only identity ([constitution](../../.specify/memory/constitution.md), principle V).
- Games exist only in memory in this feature; restart loses them. Persistence is the separate save/load feature.
- Computer players are part of this feature (autonomous play, three difficulties plus hidden random). Calibrating the levels by simulation is a later, separate task; the first levels are simple risk thresholds.
- Computer players do not use a password or session and never count as humans for Ready.
- Dice animation, manual throws and timers (2-5 s, 20 s) belong to the dice UI feature; here a throw is a single instant action.
- Locking a seat occupied by a human is refused until that human has left; the host can first free the seat.
- The attempt limit for passwords is 5 failed attempts per client and game within 10 minutes, then a 10-minute lock; the exact numbers may be tuned in the plan.
- The reconnect grace period is 60 s and fixed.
- The game lobby is the only place where seats and rules can be changed; rules are fixed after creation.
- The frontend UI in this feature is functional only (lobby and a plain turn view); styling and the hand-drawn look belong to the dice UI feature.
- Spectators are out of scope.
