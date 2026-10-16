# Feature Specification: Dice Pips and Rolling Animation

**Feature Branch**: `005-dice-pips-rolling-animation`

**Created**: 2026-10-16

**Status**: Draft

**Design**: [design.md](design.md) (mockup: [mockup.html](mockup.html))

**Input**: User description: "Improve the dice: (1) Render real dice faces with pips (dots) instead of numbers on the game table and in the game logs. (2) Add a rolling-dice animation when the user or the computer throws the dice. The backend calculates the dice values; the UI dice roll randomly and then stop on the backend-calculated value. (3) Each die rolls for its own random duration (e.g. between 2 and 5 seconds) so the game feels more exciting, instead of showing the numbers immediately after pressing the throw button."

## Clarifications

### Session 2026-10-16

- Q: Can players skip the rolling animation? → A: Yes, via a per-player local setting reachable during an active game; when active, that player's own client shows dice immediately while other clients still see the full animation.
- Q: Computer players' roll pace? → A: Same as humans (2–5 s per die) by default; the host alone can enable a "fast computer dice" game setting (1–2.5 s per die). After the computer's dice stop there is a 3 s pause, and a 2 s pause after each further computer action.
- Q: Who sees the "Dice are rolling…" text? → A: Only reduced-motion users see it visually; it is announced to screen readers for everyone.
- Q: Selected-dice visualisation? → A: The green checkmark is not sufficient (nothing like it exists on real dice); selection must be shown by a physical-looking cue such as enlarged/raised die and a thicker border. Dice picked by a computer player must be visibly highlighted for human players too.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Real dice faces with pips (Priority: P1)

Players see dice as familiar six-sided dice with dots (pips) instead of digits, both on the game table and in the game log, so the game feels like a physical dice game.

**Why this priority**: It is the core visual upgrade, delivers value on its own (no animation needed) and applies to every place a die value is shown.

**Independent Test**: Start a game, throw the dice and set some aside. Every die on the table and every die listed in the log shows pips matching its value (1–6); no digits are used to display a die value.

**Acceptance Scenarios**:

1. **Given** a thrown die with value 5, **When** it is shown on the table, **Then** it displays the standard five-pip pattern.
2. **Given** a log entry "threw" or "set aside" with several dice, **When** the log is shown, **Then** each die in the entry is rendered as a small pip face, in order.
3. **Given** a die that is not thrown yet, **When** the table is shown, **Then** an empty/blank die placeholder keeps the layout stable.
4. **Given** a screen reader user, **When** a die is focused or a log entry is read, **Then** the value is still announced as text (e.g. "Die 5, not selected").
5. **Given** a selected die, **When** shown on the table, **Then** it is clearly distinguishable from unselected dice by a strong physical-looking cue (e.g. enlarged/raised die with a thicker border), not by colour alone and not by a checkmark.

---

### User Story 2 - Rolling animation with per-die random duration (Priority: P1)

When a player (human or computer) throws the dice, every thrown die visibly rolls with random faces and then stops on the value determined by the server. Each die rolls for its own random duration between 2 and 5 seconds, so the dice settle one after the other and the outcome is revealed with suspense.

**Why this priority**: It is the main "excitement" request and replaces the instant reveal.

**Independent Test**: Press "Throw dice". The thrown dice cycle through random faces, stop at different times within 2–5 seconds, and each ends on the exact value the server reported (compare with the log entry).

**Acceptance Scenarios**:

1. **Given** it is my turn, **When** I press "Throw dice", **Then** the thrown dice start rolling immediately and none shows its final value until it stops.
2. **Given** several dice are rolling, **When** time passes, **Then** each die stops at its own moment, 2–5 seconds after the throw, and the stopping order varies between throws.
3. **Given** a die has stopped, **Then** it shows exactly the server-calculated value, never a different value.
4. **Given** a computer or another player throws, **When** the result arrives, **Then** all viewers see the same rolling animation ending on the same values.
5. **Given** some dice were set aside earlier in the turn, **When** the remaining dice are thrown again, **Then** only the newly thrown dice roll; set-aside dice stay still.
6. **Given** dice are rolling, **When** I try to select a die, throw, or end the turn, **Then** these actions are unavailable until all dice have stopped.
7. **Given** the player prefers reduced motion, **When** dice are thrown, **Then** no cycling faces or spinner are shown; the thrown dice appear blank with a static text "Dice are rolling…" in the dice area, announced to screen readers, and each die shows its final pips when it stops (after its own random 2–5 second duration).
8. **Given** a player opened the settings during an active game and enabled "skip dice animation", **When** any throw happens, **Then** that player's dice and throw log show the final values immediately (no rolling, no "rolling" text, no locked actions), while other players' clients still show the full animation.
9. **Given** the skip setting is active, **When** the player disables it, **Then** the next throw is animated again.
10. **Given** the skip setting is active, **When** other clients are still rolling, **Then** the player's dice already show the final values while the game flow (e.g. the computer's next move) still waits for the full animation and pauses.

---

### User Story 3 - Outcome revealed only after the roll (Priority: P2)

Information about the throw (log entry, toast, points, bust/Volle-Lotte notice, computer's next move) does not appear before the dice have stopped, so the animation is not spoiled.

**Why this priority**: Without it the animation would be pointless because the result would already be visible elsewhere.

**Independent Test**: Throw the dice and watch the log and notifications: the "threw …" entry and any bust notice appear only after the last die has stopped.

**Acceptance Scenarios**:

1. **Given** a throw in progress, **When** the first dice stop but others still roll, **Then** the log does not yet show the throw result.
2. **Given** the last die stops, **Then** the log entry with pip dice and any resulting notice (bust, Volle Lotte) appear.
3. **Given** a computer player's turn, **When** it throws, **Then** its following actions (setting dice aside, throwing again) start only after its dice have stopped, with the usual pacing.

### User Story 4 - Follow the computer's moves (Priority: P2)

Human players can see what the computer is doing on the table without reading the log: which dice it picks and when it acts, with short pauses between its steps.

**Why this priority**: Today the computer's picks are only visible in the log; the table should tell the story, like a real game.

**Independent Test**: Play against a computer. After its dice stop, there is a pause, then its chosen dice are highlighted on the table; after each further action there is another pause before the next one.

**Acceptance Scenarios**:

1. **Given** a computer player's dice have stopped rolling, **When** 3 seconds have passed, **Then** the computer acts (e.g. sets dice aside).
2. **Given** the computer sets dice aside, **When** the action happens, **Then** those dice are highlighted on every human player's table with the same selected-die visualisation as for human picks.
3. **Given** the computer finished an action, **When** 2 seconds have passed, **Then** its next action (throw again, bank, end turn) starts.
4. **Given** the host enabled "fast computer dice", **When** a computer throws, **Then** its dice roll for a random 1–2.5 seconds per die instead of 2–5; the 3 s and 2 s pauses are unchanged.
5. **Given** the host setting is off, **Then** computer dice roll like human dice (2–5 seconds per die).
6. **Given** a non-host player, **When** they open the settings, **Then** they cannot change the fast computer dice option (they may see its current state).

---

### Edge Cases

- A player reloads or reconnects while dice are rolling: the table shows the final values immediately (no replay required) and stays consistent with the server state.
- A new game state arrives (e.g. turn change, player left) while dice are rolling: the roll is completed or skipped without showing a wrong value; final values always match the server state.
- Throwing a single die vs. all six dice: both work; the random duration applies per die.
- Two throws in quick succession (e.g. computer turns): the next roll never starts before the previous one has finished.
- A spectator or a player in a different browser tab/window sees the same final values, though the random cycling and stop times may differ.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST display every die value (1–6) on the game table as a standard pip pattern instead of a digit.
- **FR-002**: The system MUST display every die value in the game log as a small pip face instead of a digit.
- **FR-003**: Pip-based dice MUST keep accessible text alternatives that state the value (and selection state on the table), in every supported UI language.
- **FR-004**: A die that is not thrown yet MUST be shown as a blank placeholder with unchanged size.
- **FR-005**: When dice are thrown (by a human or a computer player), the system MUST show each thrown die rolling through random faces.
- **FR-006**: Each rolling die MUST stop on exactly the value calculated by the server; the animation MUST NOT influence or alter the game result.
- **FR-007**: Each die MUST roll for its own random duration between 2 and 5 seconds, chosen independently per die and per throw.
- **FR-008**: Only newly thrown dice MUST roll; dice already set aside MUST remain unchanged.
- **FR-009**: While any die is rolling, the system MUST prevent dice selection and game actions that depend on the throw result.
- **FR-010**: The log entry for a throw, and notifications derived from it (e.g. bust, Volle Lotte), MUST be shown only after the last die has stopped.
- **FR-011**: The rolling MUST be shown to all players watching the same game, ending on identical values.
- **FR-012**: The system MUST respect the user's reduced-motion preference: no cycling faces and no spinning/moving indicator; instead a static, translated "dice are rolling" text is shown in the dice area (without covering dice) and is announced to assistive technology for all players (visible only to reduced-motion users), and it disappears when the last die has stopped.
- **FR-013**: Computer players' subsequent actions MUST wait until their dice have stopped, then pause 3 seconds before acting, and pause 2 seconds after each further computer action.
- **FR-014**: After reload or reconnect during a roll, the system MUST show the correct current values without requiring the animation.
- **FR-015**: The system MUST provide a per-player, local "skip dice animation" setting, reachable during an active game, off by default.
- **FR-016**: When the setting is active, the system MUST show that player's dice and throw results immediately; this MUST NOT affect what other players see or the game flow for them.
- **FR-017**: The setting MUST be remembered on that player's device across page reloads and games, and MUST NOT be sent to or stored on the server as game state.
- **FR-018**: The host MUST be able to enable a game-wide "fast computer dice" setting (off by default) that shortens only computer players' per-die roll duration to a random 1–2.5 seconds; other players MUST NOT be able to change it.
- **FR-019**: Dice picked or set aside by a computer player MUST be shown highlighted on the table to all human players, using the same visualisation as human picks.
- **FR-020**: Selected dice MUST be shown with a physical-looking, non-colour-only cue (e.g. enlarged or raised die with a thicker border); a checkmark alone MUST NOT be the only indicator.

### Key Entities

- **Die**: A value 1–6 (or not thrown), selection state, and a rolling state (rolling / stopped).
- **Throw**: A set of newly thrown dice with server-determined values and an individual roll duration per die.
- **Log entry (throw / set aside)**: A list of dice values shown as pip faces.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of die values shown on the table and in the log appear as pip faces; no digit is used to show a die value.
- **SC-002**: In 100% of throws, every die ends on the value the server reported.
- **SC-003**: Each die's roll lasts between 2 and 5 seconds (1 and 2.5 seconds for computer dice when fast mode is on), and in a throw of several dice the dice do not all stop at the same moment.
- **SC-004**: A throw completes (all dice stopped) within 5 seconds of pressing the throw button.
- **SC-007**: A human player can tell which dice a computer player picked from the table alone, without opening the log.
- **SC-005**: No throw result (log, notice) is visible before the last die has stopped.
- **SC-006**: Pip dice remain readable (value distinguishable) on small phone screens and in light and dark themes.

## Assumptions

- Game rules, scoring, and the server's dice calculation are unchanged; this is a presentation change only.
- The 2–5 second range is fixed (not user-configurable); skipping is only possible through the per-player local setting.
- The waiting time is part of the game's excitement and is not considered a problem; the animation is on by default.
- The random face cycling and stop times are generated on the client and may differ between viewers; only final values are guaranteed identical.
- The wait slows the game pace on purpose; computer turns remain automatic but wait for the roll.
- The fast computer dice option is a game-wide setting owned by the host, editable also during an active game (applies from the next computer throw); the 3 s / 2 s computer pauses are fixed and not shortened by it or by a player's local skip setting.
- Existing languages (English, German) keep working; the accessible labels and the "dice are rolling" text must be translated.
- Sound effects and 3D dice are out of scope.
