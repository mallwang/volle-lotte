# Feature Specification: Mobile Game Table

**Feature Branch**: `023-mobile-game-table`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "M2. Play a complete game on a phone (docs/mobile-roadmap.md): a phone-oriented landscape-only game table with a rotate blocker in portrait, touch support for all game actions, clear active-player state with the maximum number of seats, no browser zoom or horizontal scrolling. Depends on M1 (spec 022)."

**Design**: [design.md](design.md)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Play my turn with touch (Priority: P1)

As a phone player in a running game, I want to see the table and perform every action of my turn by touch, so that I can play a game without a computer.

**Why this priority**: The table and the turn actions are the whole point of M2; without them the phone cannot take part in a game.

**Independent Test**: Start a game from the phone lobby with another player or a computer, hold the phone in landscape, and play a full turn: draw a card, throw, set dice aside, throw again or bank, and reach the end of the turn.

**Acceptance Scenarios**:

1. **Given** a running game and the phone in landscape, **When** the table is shown, **Then** the user sees the dice, the card deck and the current card, the scores of all players and whose turn it is, without scrolling or zoom.
2. **Given** it is the user's turn, **When** they draw the card, throw, select and set aside scoring dice, throw the remaining dice or bank, **Then** each action is available by touch and has the same effect and the same availability rules as on desktop.
3. **Given** a throw without a scoring die (bust), a Volle Lotte, or a card that ends the turn, **When** it happens, **Then** the user sees the outcome and the points gained or lost, as on desktop.
4. **Given** an action is not legal in the current state (for example banking below the minimum or on a card that forbids it), **When** the user views the controls, **Then** the action is disabled or hidden and the reason is understandable.
5. **Given** it is not the user's turn, **When** the table is shown, **Then** no action controls can be triggered, and the user can follow the other players' turns live.
6. **Given** a selection of dice that is not allowed, **When** the user tries to confirm it, **Then** they get the same explanation as on desktop and can correct the selection.

---

### User Story 2 - Always know whose turn it is and where everyone stands (Priority: P1)

As a phone player, I want the active player, every player's score and the state of the current turn to stay clear even with eight seats, so that I can follow the game on a small screen.

**Why this priority**: A table that fits only for few players fails the "maximum seats" requirement and would make full games unplayable.

**Independent Test**: Play or watch a game with the maximum of eight players on the smallest supported landscape viewport and verify that the active player, all scores and the current turn state stay readable and nothing is hidden by other elements.

**Acceptance Scenarios**:

1. **Given** a game with two to eight seats, **When** the table is shown at any supported landscape viewport, **Then** all players are visible with name, score and computer marker, and the active player is clearly highlighted.
2. **Given** the turn changes, **When** the next player becomes active, **Then** the highlight and the visible turn state (current card, turn points, dice state) switch to them without the user having to scroll or open anything.
3. **Given** very long player names, **When** they are displayed, **Then** they are shortened visibly without hiding scores or the active-player marker.
4. **Given** a leaving player is replaced by a computer, or a human is shown as disconnected, **When** the table is shown, **Then** this state is visible on that player's seat as on desktop.
5. **Given** the turn timer or other time limits that apply on desktop, **When** they are active, **Then** the remaining time is visible on the table.

---

### User Story 3 - Landscape-only table with rotate blocker (Priority: P1)

As a phone player, I want the table to use the landscape orientation and ask me to rotate the phone in portrait, so that I get the full-size table without losing my turn.

**Why this priority**: Landscape is the design basis of the table; the blocker is the defined portrait behavior and protects the running turn.

**Independent Test**: In a running game rotate the phone from landscape to portrait and back, also in the middle of a turn with dice already selected, and verify the blocker appears and the table state is unchanged afterwards.

**Acceptance Scenarios**:

1. **Given** a running game and the phone in portrait, **When** the table would be shown, **Then** a blocker asking the user to rotate the device is shown instead of the table.
2. **Given** the blocker is shown mid-turn, **When** the user rotates back to landscape, **Then** the table shows the same turn state as before, including selected dice, and the turn did not advance because of the rotation.
3. **Given** the blocker is shown while it is the user's turn, **When** time passes, **Then** the game continues under the same rules and timers as for any player whose screen is not in use (the blocker does not pause the game for others).
4. **Given** the user is in the lobby or any other screen outside a running game, **When** they use portrait or landscape, **Then** both orientations remain supported and no blocker appears.
5. **Given** the user leaves the game while the blocker is shown, **When** they use the leave action, **Then** it remains reachable without rotating.

---

### User Story 4 - Finish a game together with desktop players (Priority: P1)

As a phone player, I want to play a game from start to end with desktop players, so that phone and desktop users can share the same game.

**Why this priority**: This is the main acceptance criterion of M2 and proves cross-client compatibility.

**Independent Test**: Host a game on desktop, join with a phone, start, and play until a player reaches the target score or wins by Clover; verify both clients agree on every state.

**Acceptance Scenarios**:

1. **Given** a game with at least one phone player and at least one desktop player, **When** turns alternate, **Then** each client shows the same scores, cards, dice and active player, and each can play its own turns.
2. **Given** any card in the deck (Bonus, Double Lotte, Stop, Star, Street, Plus/Minus, Clover), **When** it is drawn in the phone player's turn, **Then** the phone player can complete the turn according to the game rules with touch only.
3. **Given** the game ends by target score or Clover, **When** the end is reached, **Then** the phone player sees that the game is over and the final ranking, and can leave the game; full post-game flows (rematch, log) arrive in M3.
4. **Given** the phone player leaves a running game, **When** they confirm, **Then** a computer takes over their seat as on desktop and the user returns to the list.

---

### User Story 5 - Enter a running game from the lobby and list (Priority: P2)

As a phone player, I want starting a game to take me straight to the table, and to return to a game I am part of, so that M1's "game started" placeholder is replaced by real play.

**Why this priority**: It connects the lobby with the table; needed for an end-to-end flow but small once the table exists.

**Independent Test**: Start a game in the phone lobby and verify the table opens; leave the table's page by navigating back and reopen the game from the list.

**Acceptance Scenarios**:

1. **Given** the host starts the game, **When** the game begins, **Then** every phone player in the lobby reaches the table (or the rotate blocker in portrait) instead of the "table not yet available" notice.
2. **Given** a running game in which the user is seated, **When** they reload the page or open the game from the list, **Then** they return to the table at the current state.
3. **Given** a game the user is not part of, **When** it is shown in the list, **Then** its actions stay as defined in M1 (spectating and ending running games remain out of scope).

---

### Edge Cases

- The connection drops during a turn: the table must not stay blank or accept actions that cannot be sent; full reconnect polish is M3, but returning into the same game state must work.
- The user's turn begins while the rotate blocker is shown: the user sees upon rotating back that it is their turn and what the state is.
- Dice or selection state when a turn timer expires or a computer takes over the seat.
- The on-screen browser chrome (address bar, home indicator, notch or rounded corners) reduces the usable height or covers edges in landscape.
- Rapid double taps on throw, bank or draw must not send duplicate actions.
- Tapping dice with imprecise touch, or with an accidental drag, must not set aside the wrong dice.
- A game with two seats and a game with eight seats at the same viewport.
- A card with a long translated name or description in German.
- The phone is rotated during an animation (dice roll, card draw).
- Browser zoom gestures (pinch, double tap) must not break the table layout.
- Spectators and users who are not seated in a running game are not shown the table in this increment.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The mobile application MUST show a phone-specific game table for running games. It MUST NOT be the desktop table scaled to fit, and the desktop small-window resize notice MUST NOT stand in for it.
- **FR-002**: The table MUST be designed for landscape only. In portrait while a game is running, a blocker asking the user to rotate the device MUST replace the table.
- **FR-003**: Rotating the device MUST NOT change the game or the user's local turn state: after rotating back, the table MUST show the same state, including current dice selection.
- **FR-004**: While the blocker is shown, the user MUST still be able to leave the game.
- **FR-005**: All lobby and other non-game screens MUST keep supporting portrait and landscape; the blocker MUST apply to the running game only.
- **FR-006**: The table MUST support every game action available to a player on desktop through touch: draw a card, throw, select and set aside dice, throw the remaining dice, bank points, continue after a Volle Lotte, and every action required by each card type.
- **FR-007**: The rules for when an action is allowed MUST follow the server and the shared game rules, identical to desktop. Illegal actions MUST be disabled or rejected with an understandable reason.
- **FR-008**: The table MUST show, at all times without scrolling or zoom: all players with name and score, the active player, the current card, the dice, the points of the current turn and, where applicable, the carried points.
- **FR-009**: The active player MUST be clearly distinguished from the others, including the user's own turn, for every supported number of seats (two to eight).
- **FR-010**: The table MUST show computer players, players replaced by a computer, disconnected humans and a visible turn timer the same way desktop conveys them.
- **FR-011**: Turn results (bust, bank, Volle Lotte, card effects such as lost or discarded points, Street, Plus/Minus, Clover) MUST be communicated to the phone user so that no desktop-only information is needed to understand what happened.
- **FR-012**: Touch targets for dice and action controls MUST be large enough for reliable finger use, and primary actions MUST be labeled with text.
- **FR-013**: Duplicate actions caused by repeated taps MUST NOT be sent; the table MUST NOT change the game on the strength of local input before the server confirms it.
- **FR-014**: The table MUST NOT require horizontal page scrolling or browser zoom at any supported landscape viewport, and pinch or double-tap zoom MUST NOT break the layout.
- **FR-015**: Names, card names and translated texts MUST NOT hide, clip or push off screen scores, the active-player marker or primary actions, in both supported languages.
- **FR-016**: The layout MUST respect safe areas (notches, rounded corners, browser chrome) in landscape so that no control or score is covered.
- **FR-017**: When a game starts, seated phone players MUST reach the table (or the blocker in portrait); the M1 "table not available" notice MUST be removed. A seated player returning to a running game by reload or from the list MUST reach the table at its current state.
- **FR-018**: When the game ends, the table MUST show that the game is over and the final ranking and offer leaving the game. Rematch, game log and the other post-game features are out of scope.
- **FR-019**: Leaving a running game MUST behave as on desktop (a computer takes over, with confirmation) and return the user to the list.
- **FR-020**: Phone and desktop players in the same game MUST see consistent state; the phone table MUST NOT require changes to how desktop clients play or display.
- **FR-021**: The desktop and tablet application MUST remain unchanged in behavior and appearance.
- **FR-022**: The table MUST support both existing languages and the theme (light/dark) chosen in the lobby, using shared translations where texts are shared.
- **FR-023**: The table MUST honor the user's reduced-motion preference for dice and card animations, as the desktop does; wider accessibility work is part of M3.

### Key Entities

- **Game table view**: The phone presentation of a running game: players and scores, active player, card deck and current card, dice, turn points and available actions.
- **Turn state**: What the server reports for the active turn: current card, dice, selection, carried points and which actions are legal.
- **Player seat**: A human, computer, replaced or disconnected participant with name, score and active marker.
- **Orientation state**: Whether the device is in a supported (landscape) or unsupported (portrait) orientation for the table.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A phone user and desktop users complete a full game together, from start to a winner, without any user having to reload, zoom or use another device for the phone player.
- **SC-002**: Across a full game, a phone player can perform 100% of the legal actions available to a desktop player, including all seven card types.
- **SC-003**: At the smallest supported landscape viewport with eight seats, 100% of the table elements listed in FR-008 are visible simultaneously, and no horizontal page scrolling occurs.
- **SC-004**: After rotating to portrait and back, in 100% of tested cases (including mid-turn with selected dice) the table shows the same game state and no turn is lost by the rotation.
- **SC-005**: A tester can identify the active player at a glance (within about 2 seconds) in a game with eight seats.
- **SC-006**: Existing desktop and tablet behavior is unchanged: the existing desktop automated checks pass without modification to their expectations.

## Assumptions

- M1 (spec 022) is delivered: the phone lobby can create, join and start games; M0 (spec 021) provides the separate mobile application served at `/m/`.
- The maximum number of seats is eight, as on desktop.
- The supported landscape viewport range is 568 to 932 CSS pixels wide and 320 to 430 CSS pixels high, as defined in M1; the browsers are current mobile Chrome and Safari; the formal support matrix is decided in the plan.
- Game rules, protocol and server behavior are unchanged; M2 adds a phone client only, and the existing desktop client keeps its current behavior.
- Out of scope: game over extras (rematch, game log), spectator mode, relevant host settings changes during a game, polished reconnect and connection-loss communication, sound controls, wider accessibility work (all M3); installability and updates (M4); Capacitor and Android (M5).
- The phone table is shown only to seated players of a running game; users who are not seated keep the M1 list behavior.
- Sounds, if the desktop plays them, follow the existing shared sound behavior where it is available without extra design work; otherwise they are deferred to M3.
