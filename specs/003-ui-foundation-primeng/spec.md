# Feature Specification: UI Foundation

**Feature Branch**: `003-ui-foundation-primeng`

**Created**: 2026-10-15

**Status**: Draft

**Design**: [design.md](design.md) (approved layout and Terracotta palette; mockup in [mockup.html](mockup.html))

**Input**: User description: "UI foundation with PrimeNG (feature 003). Replace the minimal existing frontend screens (nickname, lobby, create game, game lobby, table, result, disconnect banner) with a polished, game-appropriate UI and make the game playable end to end afterwards, with a simple placeholder UI for dice, cards and turn actions (select dice by tap, throw, bank, end turn; no animation, cup drag or hand-drawn art yet). Warm game atmosphere with an orange and pastel palette; dark mode supported, default follows the system setting, optional manual toggle. Scope: app shell and layout, responsive (mobile first, touch friendly), accessibility basics, table layout for 2-8 players, scoreboard, game log, timers and disconnect decision dialog, toasts and errors. Out of scope: hand-drawn dice/cup/card art, dice animation, cup drag, save/load, PWA, Docker, accounts."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Warm, consistent look with light and dark mode (Priority: P1)

A player opens the app and sees a warm, inviting game look (orange accents, pastel surfaces) on every screen, with a common header and consistent buttons, forms, dialogs and messages. The app follows the device's light or dark setting. The player can override it with a toggle and the choice is remembered on that device.

**Why this priority**: The look is the point of this feature; all other screens build on it.

**Independent Test**: Open every screen with the device set to light, then dark; switch with the toggle and reload.

**Acceptance Scenarios**:

1. **Given** a device set to dark and no saved choice, **When** the app opens, **Then** it is shown in dark mode; with the device set to light, in light mode.
2. **Given** the player uses the toggle, **When** they reload the app, **Then** the chosen mode is kept regardless of the device setting.
3. **Given** any screen in either mode, **When** text and controls are inspected, **Then** text and interactive elements meet readable contrast.
4. **Given** a screen width from 320 px (phone) to desktop, **When** any screen is shown, **Then** nothing is cut off and no horizontal scrolling is needed.

---

### User Story 2 - Polished entry, lobby and game lobby (Priority: P1)

The existing flow (nickname, main lobby with open games, create game with rules, game lobby with seats, Ready and host controls) is redesigned: clear forms with inline validation, game cards in the lobby showing seats and rules, seat tiles in the game lobby showing human or computer, locked, ready and offline states, and obvious host actions.

**Why this priority**: These screens are the first impression and must be usable on a phone.

**Independent Test**: Two browsers create, join, prepare and start a game using only the redesigned screens; all earlier lobby behavior still works.

**Acceptance Scenarios**:

1. **Given** the nickname or create-game form, **When** a field is invalid, **Then** the problem is shown next to the field and the form cannot be submitted.
2. **Given** the main lobby, **When** open games exist, **Then** each shows name, free seats and key rules, and joining asks for the password in a dialog.
3. **Given** the game lobby, **When** seats change (join, lock, computer, ready, offline), **Then** each seat tile reflects its state without relying on color alone.
4. **Given** a non-host, **When** they view the game lobby, **Then** host-only controls are not offered.

---

### User Story 3 - Play a full game with a simple, clear table (Priority: P1)

During a game the player sees a table with all 2-8 players around it, the active player highlighted, a scoreboard, the current card, the dice, the turn points and the actions they can take now. A placeholder presentation is enough: dice as plain numbered tiles, cards as labeled tiles. The player taps dice to select them, then sets them aside, throws again or banks. Actions not currently allowed are disabled with a short reason. Game end shows the ranked result.

**Why this priority**: The game must be fully playable from start to result once this feature lands, even without final art.

**Independent Test**: Play a complete game with 2 and with 8 seats (humans and computers) on phone and desktop sizes, from lobby to ranked result, using only the UI.

**Acceptance Scenarios**:

1. **Given** a running game with 2, 5 or 8 players, **When** the table is shown, **Then** every player is visible with name, score and online status, and the active player is clearly marked.
2. **Given** it is the player's turn, **When** they draw a card, throw, select dice, set aside, bank, **Then** each step is achievable with one tap or click and only the currently allowed actions are enabled.
3. **Given** it is another player's turn, **When** the table updates, **Then** the player sees the dice, card and points of that turn without being able to act.
4. **Given** the turn ends with a bust, Stop, Plus/Minus or other card effect, **When** the result arrives, **Then** the player sees a clear message saying what happened.
5. **Given** the game ends, **When** the result is shown, **Then** players see the ranked list (equal scores share a rank) and can return to the lobby.
6. **Given** a rejected action, **When** the server answers with an error, **Then** a readable message is shown and the table stays usable.

---

### User Story 4 - Game log, timers and disconnect decisions (Priority: P2)

The game log is a readable history (newest visible, scrollable). When a player disconnects, everyone sees a clear warning with the remaining reconnect time; when the grace period ends, the host gets a dialog to put in a computer or free the seat, and others see that the host is deciding. Transient information (joined, left, errors, connection loss) appears as toasts that do not block play.

**Why this priority**: These make long online games manageable, but a game can be played without them being polished.

**Independent Test**: Disconnect one player in a running game; observe the warning, the countdown and the host dialog for both host and non-host.

**Acceptance Scenarios**:

1. **Given** a player disconnects, **When** others look at the table, **Then** a warning with a countdown of the grace period is shown.
2. **Given** the grace period has ended, **When** the host views the table, **Then** a dialog offers computer or free seat; other players see a waiting notice.
3. **Given** the connection to the server is lost, **When** the player looks at the screen, **Then** a clear offline notice is shown and removed after reconnecting.
4. **Given** new log entries arrive, **When** the log is open, **Then** they appear in order and are announced to assistive technology without stealing focus.

---

### User Story 5 - Accessible and touch friendly (Priority: P2)

Every function works with keyboard, touch and mouse. Focus is always visible, dialogs trap and restore focus, touch targets are comfortably large, and no state (selected die, active player, locked seat, offline) is conveyed by color alone.

**Why this priority**: Required by the project constitution (UX First) but largely a quality bar across the other stories.

**Independent Test**: Complete a game using only the keyboard; check touch target sizes and a screen reader pass on the table.

**Acceptance Scenarios**:

1. **Given** the table, **When** the player uses only the keyboard, **Then** they can select dice and trigger every allowed action in a logical order.
2. **Given** a dialog opens and closes, **When** the player navigates, **Then** focus moves into the dialog and returns to the previous element afterwards.
3. **Given** the reduced-motion setting, **When** any transition would play, **Then** it is skipped or minimized.

---

### Edge Cases

- A player's nickname or a game name is very long: it is truncated visibly without breaking the layout.
- Eight players on a 320 px wide screen: the table switches to a compact list-style layout that stays readable.
- The player's turn arrives while a dialog is open: the dialog keeps focus and the turn indication is still visible afterwards.
- Dark mode is switched mid-game: no reload, game state is unaffected.
- Browsers without a stored mode choice and without a system preference: light mode.
- Server error or protocol version mismatch: shown as a clear message, not a blank screen.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST present all screens (nickname, main lobby, create game, game lobby, table, result) in one consistent warm visual style with a common header and layout.
- **FR-002**: The app MUST support light and dark mode, default to the device setting, offer a manual toggle, and remember the manual choice on the device.
- **FR-003**: All screens MUST be usable from 320 px wide phones to desktop screens, touch and mouse, without horizontal scrolling.
- **FR-004**: Forms (nickname, create game, join password) MUST show validation problems next to the affected field and prevent invalid submission.
- **FR-005**: The main lobby MUST list open games with name, free seats and key rules, and ask for the password when joining.
- **FR-006**: The game lobby MUST show each seat with its state (human, computer, locked, ready, offline, host) using text or icons in addition to color, and MUST show host-only controls only to the host.
- **FR-007**: The table MUST show all 2-8 players with name, score and online status, mark the active player, and adapt its layout to the player count and screen size.
- **FR-008**: The table MUST show the current card, the dice, the turn points and the carried points, using simple placeholder visuals (labeled tiles) for cards and dice.
- **FR-009**: The active player MUST be able to complete the whole turn flow (draw, throw, select dice by tap or click, set aside, bank) in the UI, with only currently allowed actions enabled and a short reason shown when an action is unavailable.
- **FR-010**: The UI MUST display the outcome of every turn end (bank, bust, Stop, Double Lotte, Plus/Minus, Street, Star, Clover win) as a clear message to all players.
- **FR-011**: The result screen MUST show the ranking (equal scores share a rank) and allow returning to the lobby.
- **FR-012**: The game log MUST be readable, ordered, scrollable and announced to assistive technology without moving focus.
- **FR-013**: Disconnects MUST be shown with a reconnect countdown; after the grace period the host MUST get a decision dialog (computer or free seat) and other players a waiting notice.
- **FR-014**: Transient events and errors (joined, left, rejected action, lost connection) MUST appear as non-blocking notifications, and server errors MUST be shown in readable language.
- **FR-015**: All interactive elements MUST be keyboard operable with visible focus; dialogs MUST manage focus; state MUST NOT be conveyed by color alone; text MUST meet WCAG AA contrast in both modes.
- **FR-016**: Animations and transitions MUST respect the reduced-motion setting.
- **FR-017**: Dice, card and cup artwork, dice animation, cup dragging, save/load, PWA, Docker and accounts are NOT part of this feature; the placeholder visuals MUST be replaceable without changing the turn flow.
- **FR-018**: All existing lobby and game behavior from feature 002 MUST keep working unchanged (no protocol or rules changes).
- **FR-019**: The UI toolkit chosen for this feature MUST be added together with the framework upgrade it requires, and the app MUST build, lint, typecheck and pass tests afterwards.

### Key Entities

- **Theme**: The warm palette and component styling in a light and a dark variant, plus the player's mode preference (system, light, dark).
- **Seat tile / player tile**: A visual unit for one player showing name, score or readiness, role (host, human, computer) and connection state.
- **Table view**: The arrangement of all players, current card, dice and turn information for the running game.
- **Notification**: A short non-blocking message with a severity (info, warning, error).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new player can go from opening the app to being seated in a game lobby in under 1 minute without instructions.
- **SC-002**: A complete game (lobby to ranked result) with 2 players and with 8 players can be played using only the UI, on a 360 px wide phone and on a desktop browser.
- **SC-003**: Every core turn action (select dice, throw, bank) takes at most 2 taps or clicks.
- **SC-004**: 100% of screens pass an automated accessibility check with no serious or critical violations in both light and dark mode.
- **SC-005**: No screen shows horizontal scrolling or clipped content at widths of 320 px and above.
- **SC-006**: All automated checks (lint, typecheck, tests, build) pass, and existing test coverage thresholds of the frontend are kept.

## Assumptions

- Players use current evergreen browsers on phones and desktops.
- The frontend component toolkit is PrimeNG, chosen by the maintainer for familiarity from other projects; the exact version and the required Angular upgrade are decided in the plan.
- Placeholder dice and cards stay plain until the follow-up "dice UI" feature adds hand-drawn art and animations.
- The server protocol and the rules engine are unchanged; the existing turn state provides everything the table needs. Where a missing piece is found, it is a plan-level finding, not a rules change.
- All user-facing text stays English, like the rest of the project.
- Mockups for the new layout are produced with `/speckit-ux-review` before planning.
