# Feature Specification: Game-Over Modal

**Feature Branch**: `013-game-over-modal`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Implement roadmap item R16. Today the result is on its own page and only visible right after the game ended. Instead, show a modal as soon as the game ends, with the final table in the background. The modal cannot be closed by the backdrop, only by a 'Back to the lobby' button. A page reload no longer shows the finished game but goes straight to the lobby. If the current player won, show a fireworks animation; otherwise only the modal, no animation. Respect prefers-reduced-motion. A confetti effect from the author's other app (ReAIity Guesser) may be reused."

## Scope

In scope: a modal that opens when a game ends and shows the final ranking, the finished table behind it, a single way out ("Back to the lobby"), the end of the separate result page, a finished game no longer being restored after a reload, a celebration animation for the winner that respects reduced-motion settings, the celebration built as a reusable effect, English and German texts, user documentation and roadmap update.

Out of scope: rematch (R7), the starting-player draw (R17, only the reusable celebration is prepared for it), sounds (R11), saved games, history and statistics (R12, R15), replay of a finished game (R13), changes to the game rules, scoring or computer behaviour.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A modal shows the result as soon as the game ends (Priority: P1)

A player reaches the target score (or a Clover win ends the game). Every human at the table immediately sees a modal with the final ranking on top of the finished table. The table stays visible behind it, so the last turn and the final scores can still be seen. The modal has one button, "Back to the lobby"; clicking the backdrop or pressing Escape does not close it.

**Why this priority**: This is the core of the request: the result is shown right away, in place, and cannot be missed or dismissed by accident.

**Independent Test**: Play a game with at least two humans to the end. Every human sees the modal with the ranking while the table with the final scores stays visible behind it. Clicking next to the modal and pressing Escape leave it open; "Back to the lobby" closes it and shows the games list.

**Acceptance Scenarios**:

1. **Given** a running game, **When** a player reaches the target score, **Then** every human at the table sees the game-over modal without any navigation.
2. **Given** the modal is open, **When** a player clicks the backdrop or presses Escape, **Then** the modal stays open.
3. **Given** the modal is open, **When** a player presses "Back to the lobby", **Then** they return to the games list and the other players keep their modal.
4. **Given** the modal is open, **When** it is shown, **Then** it lists the ranking with rank, name and score for every player (ties share a rank), says how the game ended (target score or Clover), and highlights the winner and the player's own entry.
5. **Given** the last turn of the game ended with a throw, **When** the dice are still rolling or the turn result notice is still shown, **Then** the modal does not spoil the result: it opens after the final roll and notice have finished.
6. **Given** the modal is open, **When** a player looks at the table behind it, **Then** it shows the final scores, no play buttons are active, and no turn timer is running.
7. **Given** the game ended, **When** the first player returns to the lobby, **Then** the old separate result page no longer exists and no player ever sees it.

---

### User Story 2 - A page reload leads to the lobby (Priority: P1)

A player reloads the page, or reconnects after losing the connection, after the game has ended. They no longer land on a finished game; they are taken straight to the games list. The finished game does not come back.

**Why this priority**: Without this the modal could be reopened endlessly and a finished game would block a player from joining another one.

**Independent Test**: End a game, then reload the page in the browser while the modal is open (and again after having reconnected after a network drop): the games list is shown, and the player can create or join another game immediately.

**Acceptance Scenarios**:

1. **Given** the modal is open, **When** the player reloads the page, **Then** the games list is shown, not the finished game.
2. **Given** a player was offline when the game ended, **When** they return, **Then** they land in the games list, without a modal and without a "game not found" error.
3. **Given** a player left a finished game by reload, **When** they look at the games list, **Then** they can create or join other games (they are no longer "in" the finished game).
4. **Given** the last human left a finished game, **When** nobody remains, **Then** the game disappears from the games list as before.
5. **Given** another player still has the modal open, **When** one player reloads, **Then** the other player's modal is not affected.
6. **Given** a game ended and a player uses the browser's back button or a menu entry while the modal is open, **When** the navigation happens, **Then** they leave the finished game without a confirmation dialog and are not stuck in it.

---

### User Story 3 - The winner gets a celebration (Priority: P2)

When the current player won the game, a fireworks-style celebration plays together with the modal: bursts of colourful confetti over the screen. Everybody else only sees the modal, quietly. The celebration also runs when the player's own result was a Clover win. It repeats gently while the modal is open and stops when it closes.

**Why this priority**: A delight feature on top of the modal; the modal works without it.

**Independent Test**: Win a game: confetti bursts play over the modal and repeat. Lose a game: the modal opens without animation. Switch the operating system to "reduce motion" and win again: the modal opens without animation.

**Acceptance Scenarios**:

1. **Given** the current player is the winner, **When** the modal opens, **Then** a celebration animation starts and does not block clicking the modal's button.
2. **Given** the current player is not the winner, **When** the modal opens, **Then** no animation plays.
3. **Given** the player's system asks for reduced motion, **When** they win, **Then** no animation plays; the modal and its text still show that they won.
4. **Given** the celebration is running, **When** the player presses "Back to the lobby", **Then** the animation stops at once and does not continue in the games list.
5. **Given** a player has a computer-only win (a computer is the winner), **When** the modal opens, **Then** nobody gets an animation.
6. **Given** the celebration is shown, **When** it runs, **Then** it does not affect the game, the other players or the readability of the modal.

---

### User Story 4 - Texts and documentation in both languages (Priority: P3)

All new texts (modal title, winner message, button) exist in English and German. The user guide describes the modal, the reload behaviour and the celebration. The roadmap marks R16 as done and notes the reusable celebration for R17.

**Why this priority**: Required for consistency, but not needed to demonstrate the feature.

**Independent Test**: Switch the UI language between English and German at the end of a game and check every modal text; read the user guide section.

**Acceptance Scenarios**:

1. **Given** the UI language is German, **When** the modal opens, **Then** every text is German; the same applies to English.
2. **Given** the player won, **When** the modal opens, **Then** it shows a clear "you won" message in addition to the ranking; otherwise it names the winner.
3. **Given** a screen reader user, **When** the modal opens, **Then** it is announced as a dialog with its title and focus is on its button.

---

### Edge Cases

- Several players share a rank: all of them are shown under that rank; the winner is the player named by the game result.
- A player was replaced by a computer before the game ended and has not returned: they keep seeing the existing notice that a computer took over; leaving works as today. They get no celebration.
- All humans have left before the game ended and only computers finished it: nobody sees a modal; the game disappears as today.
- The host pauses the game: pausing is not possible once the game has ended.
- The window is smaller than the table minimum: the modal stays readable and usable (it is not scaled away with the table).
- The game ends while the settings dialog or the leave confirmation is open: the modal takes over; the other dialog closes or sits behind it, and "Back to the lobby" stays reachable.
- A player's browser tab was in the background when the game ended: the celebration starts when it is visible, and never piles up multiple bursts.
- The connection drops while the modal is open: the existing connection toasts apply; reconnecting leads to the games list (see User Story 2).
- A client with an older protocol version connects: the existing protocol version check applies.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When a game ends, every human seated at the table MUST see a game-over modal on top of the finished table, without any navigation or reload.
- **FR-002**: The modal MUST show the final ranking (rank, name, score, ties sharing a rank), the way the game ended (target score or Clover win), the winner, and the player's own entry; computers appear under their names.
- **FR-003**: The modal MUST open only after the last roll animation and the last turn-result notice have finished, so the end of the game is not revealed early.
- **FR-004**: The modal MUST NOT be closable by the backdrop, the Escape key or a close icon; its only button is "Back to the lobby".
- **FR-005**: While the modal is open, the table behind it MUST stay visible with the final scores, and no game action, pause or timer MUST be active.
- **FR-006**: "Back to the lobby" MUST leave the finished game without a confirmation dialog and show the games list. Leaving by other means (browser back, menu navigation) MUST also leave the finished game without a confirmation.
- **FR-007**: The separate result page MUST be removed; a finished game is never shown as a page.
- **FR-008**: After a page reload or a reconnect, a player whose game has finished MUST land in the games list and MUST be released from the finished game, so they can create or join another one at once. No error message MUST be shown for this.
- **FR-009**: A player leaving a finished game MUST NOT disturb the modal of the remaining players; a finished game without any human MUST be removed as before.
- **FR-010**: If the current player is the winner and the system does not ask for reduced motion, a fireworks-style celebration MUST play while the modal is open; it MUST repeat at a calm pace and MUST stop when the modal closes or the player leaves.
- **FR-011**: If the current player is not the winner, or the system asks for reduced motion, no celebration MUST play. The modal MUST still say that the player won.
- **FR-012**: The celebration MUST NOT block interaction with the modal and MUST NOT run on other players' screens.
- **FR-013**: The celebration MUST be a reusable effect that any screen can start and stop (R17 reuses it for the starting-player draw); its bursts are based on the confetti effect of the author's ReAIity Guesser app.
- **FR-014**: The modal MUST be keyboard operable, announced as a dialog with its title, with initial focus on "Back to the lobby", and readable in light and dark theme.
- **FR-015**: Every new text (modal title, winner message, button, documentation) MUST exist in English and German; the existing "result" texts that are no longer used MUST be removed.
- **FR-016**: Existing behaviour MUST stay unchanged: game rules, scoring, computer behaviour, timers of running games, rejoin of replaced players, lobby and table layout.

### Key Entities

- **Game result (existing)**: How the game ended (target score or Clover), the winner and the ranking with ties; provided by the finished game.
- **Game-over modal**: The one view of a finished game; shown per human seat, bound to the final table, closed only by leaving.
- **Celebration**: A short, repeating confetti effect started for the winning human only; independent of game state and reusable by other screens.
- **Finished game membership**: A player's link to a finished game; it ends when they leave and is not restored by reload or reconnect.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a 2-8 player game, 100% of seated humans see the modal with the correct ranking within 1 second after the final roll and notice have finished.
- **SC-002**: 100% of attempts to close the modal other than by its button (backdrop click, Escape) leave it open.
- **SC-003**: After a reload or reconnect following the end of a game, 100% of players land in the games list within the normal load time and can join or create another game right away.
- **SC-004**: The winner sees the celebration in 100% of games they win and in 0% of games they do not win; with reduced motion requested, in 0% of games.
- **SC-005**: The modal's button and focus are reachable by keyboard alone, and text contrast meets the existing accessibility checks in light and dark theme.
- **SC-006**: No existing game, lobby or table behaviour regresses (existing automated tests pass unchanged except those that expected the result page).

## Assumptions

- "Winner" means the player named as winner in the game result; for ties on rank, only the named winner gets the celebration.
- A player who got replaced by a computer is not seated any more; the existing "a computer took over" notice keeps its priority for them.
- The modal belongs to the table view: the game page shows the table for both running and finished games, and the modal is shown while the game is finished.
- Releasing a player from a finished game on reload or reconnect happens on the server (the server decides what a returning player sees), so a reload on any browser behaves the same.
- The effect is based on the open-source confetti library the author already uses in ReAIity Guesser (loaded there from a CDN); this app bundles it as a normal dependency instead of a CDN script, in line with the single-origin Docker deployment.
- "Fireworks" in the roadmap is implemented as repeated confetti bursts; the celebration stays a small component, so it can be swapped for a different effect later.
- A new `PROTOCOL_VERSION` is not needed if the message shapes stay the same; the finished game simply stops being returned on session start.
