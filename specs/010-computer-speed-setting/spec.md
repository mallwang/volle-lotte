# Feature Specification: Computer Player Speed Setting

**Feature Branch**: `010-computer-speed-setting`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Computer player speed setting. The host sets how fast computer players act with a slider, in the game lobby and during a running game. Every player is told with a toast when the host changes a setting. The current computer pacing is too slow and needs a faster default."

## Scope

In scope: a host-controlled speed setting for computer players (lobby and running game), faster default pacing, a toast for every player when the host changes a game setting (the new speed setting and the existing "fast computer dice" option).

Out of scope: remembering any setting between games (every game starts with the defaults), per-computer speeds, changing the pacing of human turns or the human turn limits, changing the rules or the computers' decisions.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Faster computer players by default (Priority: P1)

A human player at a table with computer players waits much less between their own turns. Today a computer takes a long time before it throws, rolls its dice for a long time, waits again before taking dice, and the result of its turn stays on the table for long. With the new default these waits are noticeably shorter, while every step stays readable (the player can still see what the computer threw, which dice it took and how its turn ended).

**Why this priority**: This is the core complaint. It delivers value even without any slider.

**Independent Test**: Play a game with one human and three computers using the default setting and measure the time from the end of the human's turn to the start of their next turn; compare with the previous release.

**Acceptance Scenarios**:

1. **Given** a new game with default settings, **When** computers play their turns, **Then** the time a computer needs for a full turn is clearly shorter than before the change.
2. **Given** a computer throws, **When** its dice roll, **Then** the player still sees the roll, the result and the dice the computer takes before the next step starts.
3. **Given** a computer's turn ends (bust, bank, Stop), **When** the result is shown, **Then** it is visible long enough to be read, and the next player may act only after it was shown.

---

### User Story 2 - Host chooses the computer speed with a slider (Priority: P1)

The host sees a speed slider in the game lobby, from slow to very fast, with the default preselected. The chosen value is taken over when the game starts. The host can also move the slider in the running game (table settings). Other players see the current value but cannot change it. Every new game starts at the default; nothing is remembered from earlier games.

**Why this priority**: It gives the table control over the pace; humans who want to move on quickly can have it.

**Independent Test**: Create a game, move the slider in the lobby, start the game and check that computers act at the chosen pace; move the slider mid-game and check that the pace changes from the next computer step on.

**Acceptance Scenarios**:

1. **Given** a newly created game lobby, **When** the host opens it, **Then** the slider is at the default position.
2. **Given** the host moved the slider in the lobby, **When** the game starts, **Then** computers use that speed from the first turn.
3. **Given** a running game, **When** the host moves the slider, **Then** all following computer steps use the new pace for every player at the table.
4. **Given** a guest in the lobby or at the table, **When** they look at the setting, **Then** they see the current value and a note that only the host can change it; the control is disabled.
5. **Given** the host created a game earlier with a non-default speed, **When** they create another game, **Then** the slider is at the default again.
6. **Given** the slider at its fastest position, **When** computers play, **Then** the steps are still shown in the right order (throw, result, selection, end of turn), only with minimal waits.

---

### User Story 3 - Toast when the host changes a setting (Priority: P2)

When the host changes a game setting, every player in the game (host and guests) gets a short toast that says which setting changed and to what value. This covers the new computer speed and the existing "fast computer dice" option.

**Why this priority**: Settings now change the pace for everybody; players must understand why the game suddenly speeds up or slows down.

**Independent Test**: With two human players, change each setting as host and check that both players see a toast with the setting name and new value.

**Acceptance Scenarios**:

1. **Given** a game with several humans, **When** the host changes the computer speed, **Then** every human sees a toast naming the setting and the new value.
2. **Given** the same game, **When** the host switches "fast computer dice", **Then** every human sees a toast with the setting and its new state.
3. **Given** the host drags the slider across several positions, **When** the drag ends, **Then** players are not flooded: one toast per settled change, showing the final value.
4. **Given** a player who joins or rejoins later, **When** they enter the game, **Then** they see no toast for earlier changes.
5. **Given** the host's settings do not change, **When** the game state is updated for other reasons, **Then** no setting toast appears.

---

### Edge Cases

- The host changes the speed while a computer step is already waiting: the step in progress finishes with its old timing or is rescheduled; no step is skipped or doubled.
- The host leaves and another human becomes host: the new host may change the setting; the value stays.
- No computer players at the table: the setting is still available but has no visible effect.
- A human takes over a seat from a computer (rejoin) or a computer replaces a human: the current speed applies to the computer.
- Human turn limits start after the client's dice animation; a faster setting must not make a human's limit start before their dice have finished rolling.
- A client with an older protocol version is rejected as before.
- The game is finished: the setting can no longer be changed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The default pace of computer players MUST be clearly faster than today's pace (waiting before a throw, dice rolling time, waiting before and while taking dice, and the time a turn result stays shown), while each step stays readable.
- **FR-002**: The host MUST be able to set the computer speed with a slider with discrete steps, from slow to very fast, in the game lobby.
- **FR-003**: The speed chosen in the lobby MUST apply from the first computer turn of the started game.
- **FR-004**: The host MUST be able to change the speed in a running game; the change MUST apply to all following computer steps for every player.
- **FR-005**: Only the host MUST be able to change the speed; other players MUST see the current value but not change it, with a note why. The server MUST reject changes from non-hosts.
- **FR-006**: Every game MUST start with the default speed; the system MUST NOT remember the setting across games or sessions.
- **FR-007**: The computer speed MUST also scale the dice roll duration shown for computers' throws, so one setting controls the whole computer pace.
- **FR-008**: The existing on/off option "fast computer dice" MUST be replaced by the speed setting, so there is one control for computer pace. The range MUST contain a step at least as fast as today's fast mode, and no step may be slower than today's normal pace.
- **FR-009**: All players in the game MUST receive a toast when the host changes a game setting, naming the setting and the new value, in the player's language.
- **FR-010**: The toast rule MUST cover the computer speed and the existing "fast computer dice" option (as long as it exists), and any later host setting.
- **FR-011**: Repeated changes while dragging the slider MUST result in one toast with the final value, not one per step passed.
- **FR-012**: Players who join or rejoin MUST NOT see toasts for changes made before they arrived.
- **FR-013**: Human turn limits MUST remain fair: they start only after the dice animation of the preceding step has finished on the client, regardless of the speed.
- **FR-014**: The speed setting MUST be available in both languages (English and German) with accessible labels, including keyboard operation of the slider.
- **FR-015**: Rules, the computers' decisions and the human turn limits MUST remain unchanged.

### Key Entities

- **Computer speed**: A per-game setting owned by the host, one of several discrete steps from slow to very fast, with a default; shared with all players; not persisted beyond the game.
- **Setting change notice**: A short message to every player naming the changed setting and its new value.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At the default speed, the average time a human waits between the end of their own turn and the start of their next one, with three computers at the table, is at least 40% shorter than before this change.
- **SC-002**: At the fastest step, a computer's turn takes less than a quarter of the time it takes at the slowest step.
- **SC-003**: The host can find and change the speed in the lobby and in a running game in under 10 seconds without help.
- **SC-004**: In a test with two humans, 100% of host setting changes produce exactly one toast per human, with the correct setting and value.
- **SC-005**: Over 20 consecutive games with computers at every speed step, no computer step is skipped, repeated or shown out of order.
- **SC-006**: A new game never starts at a non-default speed, even if the same host changed it in a previous game.

## Assumptions

- The slider has five steps. The default is the middle step, chosen so that the average wait is at least 40% shorter than today (SC-001). Exact timings are decided in planning.
- Today's timings are the baseline (computer wait before acting 2 s, dice roll up to 3 s or 1.5 s in fast mode, 3.25 s wait after a throw, 2 s pick highlight, 6 s result notice); the previous "fast dice" mode becomes one of the faster steps.
- The result notice of a finished turn is shortened but never removed, so players can read what happened; the lowest wait is chosen in planning.
- The lobby shows the setting in the game lobby view the host already uses; the running-game control lives in the existing table settings dialog.
- A protocol change is acceptable; clients and server are deployed together and an older client is rejected by the existing version check.
- The toast uses the existing toast mechanism and wording style of the app.
