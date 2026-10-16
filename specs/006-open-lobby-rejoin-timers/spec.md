# Feature Specification: Open Lobbies, Rejoin, Leave Warning and Turn Timers

**Feature Branch**: `006-open-lobby-rejoin-timers`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Open lobbies without password, rejoin of left games, leave warning modal and per-action turn timers."

## Clarifications

### Session 2026-10-16

- Q: What happens after repeated timeouts of the same player? → A: After 3 consecutive timeouts (no own action in between) the player is replaced by a bot like on leave, with a visible warning beforehand; rejoin remains possible.
- Q: Do turn timers keep running while a player is disconnected? → A: Yes. Timers keep running, automatic actions happen and count toward the 3 consecutive timeouts; the bot takes over at the latest when the 30 s grace period ends.
- Q: How is "only that exact player" enforced for rejoin? → A: Only via the stored session in the same browser; without it there is no rejoin and the bot plays to the end.
- Q: How long may a replaced player rejoin? → A: Any time while the game is running; the bot keeps playing until the rejoin, and score and state are kept.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Open games without a password (Priority: P1)

A host creates a game and may leave the password empty. Such a game is open: anyone can join it from the lobby list with one tap while the game has not started, and is placed on a free human seat. Games with a password behave as today. Once a game has started, nobody can join it any more; it is shown as closed (lock icon, "running").

**Why this priority**: Lowers the barrier to start playing with friends; the other stories build on a lobby that is easy to join.

**Independent Test**: Create a game without password, join from a second session without any password prompt, start the game, and verify a third session can no longer join.

**Acceptance Scenarios**:

1. **Given** the create-game form, **When** the host leaves the password empty and creates the game, **Then** the game is created and listed as open (no password required).
2. **Given** an open game in lobby phase with a free human seat, **When** a player taps Join, **Then** they enter without a password prompt and take the first free human seat.
3. **Given** an open game in lobby phase with no free human seat, **When** a player looks at the list, **Then** the game is shown as full and cannot be joined.
4. **Given** a started game, **When** any player looks at the list, **Then** it shows the lock icon and "running" and offers no Join action.
5. **Given** a game with a password, **When** a player joins, **Then** the password prompt appears as today.

---

### User Story 2 - Host closes a seat and removes a player (Priority: P2)

In the game lobby, the host can close a seat that is occupied by a human player. That player immediately sees a modal telling them they were removed by the host, with a "Back to lobby" button. They cannot rejoin that game afterwards. A player who left the game lobby voluntarily frees their seat and may join again.

**Why this priority**: Gives hosts control over open games, which is needed once passwords are optional.

**Independent Test**: With two sessions in a game lobby, host closes the other player's seat; the other session shows the modal and its Join action for that game is no longer available.

**Acceptance Scenarios**:

1. **Given** a human player on a seat in the game lobby, **When** the host closes that seat, **Then** the seat shows as closed for everyone and the player sees a modal "You were removed by the host" with a "Back to lobby" button.
2. **Given** the removal modal, **When** the player taps "Back to lobby", **Then** they land on the game list and the modal is dismissed.
3. **Given** a player removed by the host, **When** they try to join that game again, **Then** joining is refused with a clear message.
4. **Given** a player who left the game lobby voluntarily, **When** they join the same open game again, **Then** they are placed on a free seat.

---

### User Story 3 - Leave warning and bot replacement (Priority: P2)

When a player chooses "Leave game" in a running game, a modal warns about the consequences: they will be replaced by a computer player of random difficulty, they return to the lobby, and they can rejoin later. Confirming replaces them by the bot immediately, without waiting for the host. If the connection is lost, the player has 30 seconds to return before the bot takes over automatically. No host decision dialog is shown in either case.

**Why this priority**: Prevents accidental leaving and keeps games moving without blocking other players.

**Independent Test**: Press Leave in a running game, verify the modal text, cancel (nothing changes), press Leave again and confirm (bot plays next turn). Separately, drop the connection and verify the bot takes over after 30 seconds.

**Acceptance Scenarios**:

1. **Given** a running game, **When** the player presses "Leave game", **Then** a modal explains the consequences and offers Cancel and Confirm; nothing changes before confirmation.
2. **Given** the modal, **When** the player cancels, **Then** the game continues unchanged.
3. **Given** the modal, **When** the player confirms, **Then** a computer player of random difficulty takes their seat immediately and the player returns to the lobby.
4. **Given** a lost connection, **When** 30 seconds pass without the player returning, **Then** a bot takes over automatically and the game is not paused for a host decision.
5. **Given** a lost connection, **When** the player returns within 30 seconds, **Then** they continue as themselves.

---

### User Story 4 - Rejoin a left game (Priority: P2)

A player who left a running game (or was replaced after a connection loss) sees a "Rejoin" button for that game in the lobby. Only that exact player can use it. On rejoin, the bot stops playing for them and the player resumes their seat. The game log records the return, and all players clearly see that the player is back and no longer computer-controlled.

**Why this priority**: Makes accidental or temporary leaving harmless.

**Independent Test**: Leave a running game, see the Rejoin button in the list, rejoin, and verify the log entry and visible seat change in another session; verify a different player sees no Rejoin button.

**Acceptance Scenarios**:

1. **Given** a player replaced by a bot, **When** they view the game list, **Then** the running game shows a "Rejoin" button only for them.
2. **Given** another player, **When** they view the list, **Then** the running game offers no Join or Rejoin action.
3. **Given** the Rejoin button, **When** the player taps it, **Then** they resume their seat with their current score and the bot stops acting for that seat.
4. **Given** a rejoin, **When** other players look at the table and log, **Then** a log message announces the return and the seat no longer shows as computer-controlled (visible highlight/notification).
5. **Given** a game that has finished or been removed, **When** the player views the list, **Then** no Rejoin button is shown.

---

### User Story 5 - Turn timers (Priority: P1)

Every human action has a time limit shown as a countdown to the active player and everyone else. When it expires the system acts for the player:

- Draw a card / roll the dice: after 10 seconds the action is performed automatically.
- Set-aside selection: after 15 seconds without a confirmed choice the player skips the turn and the next player is up.
- Secure points / continue rolling: after 15 seconds the points are secured automatically.

Timers start only after the dice roll animation has finished, so animation time never counts against the player.

**Why this priority**: Prevents idle players from stalling a game for everybody.

**Independent Test**: In a game with one human, wait without acting in each phase and verify the automatic outcome and the countdown.

**Acceptance Scenarios**:

1. **Given** a human's turn to draw or roll, **When** 10 seconds pass without action, **Then** the draw or roll happens automatically and is logged as automatic.
2. **Given** the set-aside selection phase, **When** 15 seconds pass without a confirmed choice, **Then** the player skips and the next player's turn begins.
3. **Given** the secure/continue decision, **When** 15 seconds pass, **Then** the points are secured automatically.
4. **Given** dice are still animating, **When** a roll has just happened, **Then** the countdown does not start until the animation ends.
5. **Given** any active timer, **When** the player acts in time, **Then** the timer stops and restarts for the next phase.
6. **Given** a computer player's turn, **When** it plays, **Then** no countdown is shown.
7. **Given** a player has had 2 consecutive timeouts, **When** their next turn starts, **Then** a visible warning tells them that another timeout replaces them by a computer player.
8. **Given** a player has had 3 consecutive timeouts, **When** the third expires, **Then** they are replaced by a computer player of random difficulty, a log entry explains why, and they can rejoin.
9. **Given** a player with timeouts counted, **When** they perform any action themselves, **Then** the consecutive-timeout count resets to 0.

---

### Edge Cases

- The host closes a seat while that player is disconnected: the removal modal is shown when they return; they remain blocked from rejoining.
- A player is replaced by a bot while it is that seat's turn: the bot takes the pending action without losing the turn.
- Two rejoin attempts (two tabs) for the same player: only one session holds the seat; the other is informed it was replaced.
- Several players leave; all can rejoin their own seats independently.
- A player is disconnected during their turn: the timer keeps running, automatic actions are applied and counted as timeouts; whichever comes first (third timeout or end of the 30 s grace period) hands the seat to a computer player.
- The player's stored session is lost (cleared browser data, other device): no Rejoin is offered and the bot plays to the end of the game.
- Timer expires at the same moment the player acts: exactly one action is applied.
- The skipped player in a set-aside timeout scores nothing for the current turn.
- Every human left and only bots remain: the game continues; existing cleanup of abandoned games still applies.
- Open game list refreshes while a player is on the password prompt or modal: modal state is unaffected.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Hosts MUST be able to create a game with an empty password; the game is then open.
- **FR-002**: The game list MUST distinguish password-protected games from open games, and show started games as closed with a lock icon and "running".
- **FR-003**: Players MUST be able to join an open game in lobby phase without a password and are assigned to a free human seat; full games MUST be shown as full.
- **FR-004**: Joining a started game MUST NOT be possible for anyone except rejoining as the same former player (FR-011).
- **FR-005**: Hosts MUST be able to close an occupied human seat in the game lobby.
- **FR-006**: A player removed by the host MUST see a modal stating the removal with a "Back to lobby" button that returns them to the game list.
- **FR-007**: A player removed by the host MUST be refused when trying to join that game again.
- **FR-008**: A player who left the game lobby voluntarily MUST be able to join the game again.
- **FR-009**: Pressing "Leave game" in a running game MUST show a confirmation modal describing: replacement by a computer player of random difficulty, return to the lobby, and the possibility to rejoin.
- **FR-010**: Confirming leave MUST replace the player by a computer player of random difficulty immediately, without a host decision.
- **FR-011**: A player who left a running game or was replaced after connection loss MUST be able to rejoin their own seat via a button in the game list, and only that exact player, identified by their stored session in the same browser (no account, no rejoin code).
- **FR-012**: On connection loss, the player MUST have 30 seconds to return before a bot takes over automatically; the host decision dialog for disconnected players is removed.
- **FR-013**: On rejoin the computer player MUST stop acting for that seat, the player keeps their score and state, and the game log MUST contain a message about the return.
- **FR-014**: All players MUST be able to clearly see that a rejoined player is back and no longer computer-controlled (seat indicator and a transient notification).
- **FR-015**: The server MUST enforce a 10 s limit for drawing and rolling, performing the action automatically on expiry.
- **FR-016**: The server MUST enforce a 15 s limit for set-aside selection; on expiry the player skips and the next player is up.
- **FR-017**: The server MUST enforce a 15 s limit for secure points / continue rolling; on expiry the points are secured automatically.
- **FR-018**: Timers MUST start after the dice roll animation has finished and MUST be visible to all players as a countdown for the active human player.
- **FR-018a**: After 3 consecutive timeouts of the same player (no own action in between) the system MUST replace them by a computer player as on leave, warn them visibly before the third, and keep rejoin possible.
- **FR-018b**: Turn timers MUST keep running while the active player is disconnected; resulting automatic actions count as timeouts for FR-018a.
- **FR-019**: Automatic actions and skips MUST appear in the game log as such.
- **FR-020**: All new texts MUST be available in every supported language.

### Key Entities

- **Game**: lobby phase or running; open or password-protected; seats; host.
- **Seat**: free, closed, human, or computer; a computer seat remembers the human it replaced.
- **Former player**: the identity allowed to reclaim a bot-held seat.
- **Banned player**: identity refused from joining a specific game after host removal.
- **Turn timer**: deadline for the active human's current action, with a fixed length per action type.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A player can join an open game in one tap, with no text input.
- **SC-002**: A removed player sees the removal modal within 2 seconds of the host's action.
- **SC-003**: A replaced player can return to their seat within 2 taps from the game list, and others see the return within 2 seconds.
- **SC-004**: No game is blocked for longer than 15 seconds by an inactive human player in any single action.
- **SC-005**: 100% of timer expiries result in exactly one automatic outcome per action type as specified.
- **SC-006**: Leaving a running game by accident can be undone in full (score and seat kept) in 100% of cases while the game still runs.

## Assumptions

- The constitution (principle V) states that a game is created with a password; it must be amended (MINOR) to make passwords optional before implementation.
- Closing a seat by the host is only possible in the lobby phase; closing a human seat in a running game is out of scope.
- A voluntary leave in the lobby phase frees the seat as today; ban applies only to host removal.
- The ban is held for the lifetime of the game and is tied to the player identity, not the nickname.
- The random bot difficulty is chosen from the existing computer levels.
- Timers apply to human players only; the animation durations in use today (up to about 3 s per roll) are the basis for starting the countdown.
- Timer lengths (10 s / 15 s / 15 s) are fixed, not host-configurable.
- A rejoin is possible while the game is running and the seat is still held by the bot that replaced the player.
- A roll that ends in a bust ends the turn without a decision, so no secure/continue timer starts; the next player's timer starts after the bust is shown.
- Countdowns are shown to all players at the table (there are no separate spectators).
