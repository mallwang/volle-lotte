# Feature Specification: Spectators

**Feature Branch**: `016-spectators`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "R8. Spectators (docs/roadmap.md): other players can join a running game as read-only spectators. They see the table with scores and the current action of the active players, the log, the leave button and the 'skip dice animation' setting; no play buttons. A counter shows the number of real spectators (players do not count). Joining or leaving only changes the counter: no log entry, toast or message for the players. Spectators are separate from the 2-8 player limit, never block timers or the game end; the host can disable spectating or remove spectators."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Watch a running game (Priority: P1)

A visitor sees a running game in the games list and joins it as a spectator. They follow the game live: the table with every player's score, the dice and the action of the active player, and the game log. They cannot act in the game. When they are done, they leave.

**Why this priority**: This is the core value: friends, waiting players and curious visitors can follow a game without taking a seat.

**Independent Test**: With a running game of two players, a third visitor joins as spectator, sees the table update live while the players take turns, sees no play buttons, and can leave and return to the lobby.

**Acceptance Scenarios**:

1. **Given** a running game that allows spectating, **When** a visitor chooses to watch it from the games list, **Then** they see the live table with scores, the current action of the active player and the log, and no play buttons.
2. **Given** a spectator watching a game, **When** the active player throws, secures dice or banks, **Then** the spectator sees the result of each action as it happens.
3. **Given** a spectator watching a game, **When** they use the leave button, **Then** they return to the lobby and the game continues unchanged.
4. **Given** a spectator, **When** they open settings, **Then** they can change "skip dice animation" and see no host-only settings.
5. **Given** a game whose maximum number of players (8) is reached, **When** a visitor wants to watch it, **Then** they can join as spectator regardless.

---

### User Story 2 - Undisturbed players with a spectator counter (Priority: P1)

Players and spectators see how many real spectators are currently watching. When a spectator joins or leaves, only this counter changes: there is no log entry, toast or other message, so the game flow is not disturbed. Players themselves never count as spectators.

**Why this priority**: The "do not disturb" rule is a stated requirement and protects the game experience; the counter is the only feedback.

**Independent Test**: Join and leave as spectator several times while two players play; verify that the counter changes accordingly and that the players' log and screen show nothing else.

**Acceptance Scenarios**:

1. **Given** a game with two players and no spectators, **When** a spectator joins, **Then** the counter shows 1 for everyone in the game and nothing else changes.
2. **Given** a game with one spectator, **When** that spectator leaves or loses the connection for good, **Then** the counter shows 0 and no log entry or message appears.
3. **Given** a game with spectators, **When** a player's counter is shown, **Then** it counts only spectators, never the players (including computer players).

---

### User Story 3 - Host controls spectating (Priority: P2)

The host decides whether a game may be watched. The host can switch spectating off, which prevents new spectators and removes the current ones, and can remove individual spectators.

**Why this priority**: Hosts need control over who watches their game, but watching works without it.

**Independent Test**: As host, disable spectating while a spectator watches: the spectator is sent back to the lobby and the game no longer offers "watch". Re-enable it and remove a single spectator.

**Acceptance Scenarios**:

1. **Given** a host who disables spectating, **When** the setting is saved, **Then** the game offers no "watch" action, and current spectators are returned to the lobby with a short explanation shown to them only.
2. **Given** a game with spectators, **When** the host removes one, **Then** that spectator is returned to the lobby with a short explanation, and the counter decreases.
3. **Given** a removed spectator, **When** they try to watch the same game again, **Then** they are refused for that game while the host keeps it that way.
4. **Given** a non-host player, **When** they look at the game settings, **Then** they cannot change spectating or remove spectators.

---

### User Story 4 - Spectators never disturb the game (Priority: P2)

Spectators have no influence on game progress. Turn timers, inactivity handling, rematch and game end run exactly as without spectators. A game ends when its players are done, even if spectators are still watching, and spectators then see the game-over view.

**Why this priority**: Prevents spectators from stalling games; essential for fairness, but follows from the read-only role.

**Independent Test**: Run a game with timers where all players leave or finish while a spectator is connected, and verify the game ends and is cleaned up as if there were no spectator.

**Acceptance Scenarios**:

1. **Given** a game in which only spectators remain connected, **When** the players' timers or disconnect rules would end or pause the game, **Then** the same happens as without spectators.
2. **Given** a spectator who is disconnected or idle, **When** the active player's turn timer runs, **Then** the timer is not affected.
3. **Given** a game that ends, **When** the game-over view appears, **Then** spectators see it and can leave; they get no rematch action.

---

### User Story 5 - Reconnect as spectator (Priority: P3)

A spectator who briefly loses the connection (reload, network drop) returns to watching the same game without any steps.

**Why this priority**: Comfort feature; spectating works without it.

**Independent Test**: Reload the page as spectator and verify that the same game is shown again and the counter still counts one spectator.

**Acceptance Scenarios**:

1. **Given** a spectator who reloads the page, **When** the app loads, **Then** they are back in the same game as spectator if it is still running and spectating is allowed.
2. **Given** a spectator whose game has ended or disabled spectating meanwhile, **When** they return, **Then** they land in the lobby.

---

### Edge Cases

- A game that is still in its lobby phase (not yet running): spectating is offered only for running games.
- The host disables spectating while spectators are connected: spectators are removed (see User Story 3).
- A player of the same game tries to also watch it: not possible; players already see the table.
- A spectator tries to perform a play action (for example by manipulating the client): the server rejects it.
- A restarted server loads a persisted game: spectators are not persisted; the counter starts at 0.
- A game ends and a rematch starts in the same room: spectators are not carried into the rematch lobby and return to the lobby.
- A password-protected game: a visitor without the password cannot watch it.
- The same visitor opens the game in two tabs: counts as one spectator per browser session.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Visitors MUST be able to join a running game as read-only spectator from the games list, if spectating is allowed for that game.
- **FR-002**: Spectating MUST NOT count towards the 2-8 player limit, and the number of spectators MUST NOT limit the number of players.
- **FR-003**: Spectators MUST see the same table as the players: all players with scores, the current action of the active players, and the game log.
- **FR-004**: Spectators MUST NOT see any play controls (select, throw, bank, ready, rematch), and the server MUST reject any play action coming from a spectator.
- **FR-005**: Spectators MUST have a leave button and the "skip dice animation" setting; host-only settings MUST stay hidden from them.
- **FR-006**: Every participant of the game, players and spectators, MUST see a counter of the current number of real spectators; players and computer players MUST NOT be counted.
- **FR-007**: A spectator joining or leaving MUST change only the counter: no log entry, toast, sound or other message for players or other spectators.
- **FR-008**: Spectators MUST NOT block or influence turn timers, inactivity handling, the game end or the cleanup of a game.
- **FR-009**: The host MUST be able to disable and re-enable spectating per game; disabling MUST remove all current spectators and hide the "watch" action.
- **FR-010**: The host MUST be able to remove individual spectators; a removed spectator MUST NOT be able to watch the same game again while the game runs.
- **FR-011**: A spectator who is removed or whose game ended or disabled spectating MUST be returned to the lobby with a short message shown to that spectator only.
- **FR-012**: A password-protected game MUST require its password from spectators as well; an open game can be watched by anyone who sees it in the games list.
- **FR-013**: A spectator who reloads or briefly loses the connection MUST return to the same game as spectator without extra steps while it is still running and allowed.
- **FR-014**: Spectating MUST be enabled by default for new games.
- **FR-015**: Spectators MUST be shown the game-over view when the game ends and MUST be returned to the lobby when leaving; they take no part in a rematch.
- **FR-016**: The change to the client-server contract MUST be versioned so that outdated clients are prompted to update in the lobby, in line with the existing update rule.
- **FR-017**: All new texts MUST be available in every supported language.

### Key Entities

- **Spectator**: An anonymous visitor watching one running game without a seat. Has a display name for the host's removal list, no score, no turn, no influence on game state. Not persisted across server restarts.
- **Spectating setting**: A per-game switch controlled by the host, on by default, deciding whether the game can be watched.
- **Spectator counter**: The number of currently connected real spectators of a game, shown to all participants.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A visitor can start watching a running game in at most 2 interactions from the games list.
- **SC-002**: A spectator sees a player's action on the table within 1 second of it happening, on the same terms as other players.
- **SC-003**: In a game of 8 players with 10 spectators, all players still play normally and no player is refused a seat because of spectators.
- **SC-004**: Across repeated joins and leaves of spectators, 0 additional log entries, toasts or messages appear for players.
- **SC-005**: With a spectator connected, game end, timers and cleanup happen at exactly the same moments as without the spectator.
- **SC-006**: After the host disables spectating or removes a spectator, the affected spectator is back in the lobby within 2 seconds.

## Assumptions

- Open question from the roadmap resolved as: open games can be watched by anyone from the games list; password-protected games require the password for spectators too (consistent with the optional lobby passwords principle).
- Spectating is offered for running games only; games still in their lobby phase are joined as players.
- Spectators are anonymous like players (nickname plus server-issued session); they enter a display name so the host can recognise and remove them, but it is not shown to players beyond the host's removal list.
- The spectator counter is shown to players and spectators alike; names of spectators are visible to the host only.
- No upper limit for the number of spectators is set in this feature.
- Spectators are held in memory only and do not survive a server restart.
- Out of scope: chat or reactions from spectators, spectator replays of finished games, and letting spectators take over a free seat.
- Depends on the existing games list, lobby password, game log and settings features.
