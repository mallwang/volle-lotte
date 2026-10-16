# Feature Specification: Active Game Table UI Redesign

**Feature Branch**: `007-active-game-table-ui`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Redesign the active game UI (phase 'running', after the lobby start), desktop first (mobile layout follows in a later spec). Layout like an online poker table with players around an oval table, seat cards, central card, draw pile and discard pile, regrouped into standalone components. Keep existing behaviour."

**Design**: [design.md](design.md) (approved mockup: [mockup.html](mockup.html))

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Players around the table (Priority: P1)

Once the game has started, the players are shown as small seat cards arranged around an oval table in clockwise order, like at an online poker table. The local player always sits at the bottom centre and is visibly highlighted ("you"), regardless of their seat number; the other players are rotated accordingly, so the turn order runs clockwise starting from the local player. Each seat card shows a human or computer icon, the name and the current score. The player whose turn it is has a clearly highlighted card that also contains the turn timer, so it is obvious whom the timer belongs to. Offline players are marked on their card.

**Why this priority**: This is the core of the redesign and replaces the separate player list; it is the biggest gain in orientation.

**Independent Test**: Start a game with 2, 4 and 8 players (humans and computers) and check seat positions, highlighting of the own seat, highlighting of the active seat with the timer inside it, and clockwise order.

**Acceptance Scenarios**:

1. **Given** a running game, **When** the table is shown, **Then** every player appears once as a seat card with icon (human/computer), name and score, and the local player's card is at the bottom centre with a "you" marker.
2. **Given** players seated 1..N, **When** the local player has seat k, **Then** the next player in turn order appears to the left of the local player and the order continues clockwise around the table.
3. **Given** it is a player's turn, **When** the turn timer runs, **Then** only that player's card is highlighted and shows the timer; no timer is shown elsewhere.
4. **Given** the local player is the active player, **When** the table is shown, **Then** their card shows both the "you" and the "active" highlight distinguishably.
5. **Given** a disconnected player, **When** the table is shown, **Then** their card shows an offline state.
6. **Given** 8 players, **When** the table is shown, **Then** the seats are 3 at the top, 3 at the bottom (including the local player at the centre), 1 on the left and 1 on the right; with fewer players a symmetric subset is used and no seat overlaps another or the table centre.

---

### User Story 2 - Cards and piles in the table centre (Priority: P1)

The centre of the table shows the active card as a real card (portrait, 2:3), the draw pile and the discard pile. The card shows its value as text, its localized name and an icon, and follows the light/dark theme and the selected language. The draw pile is tidy and shows the number of remaining cards and a visual fill level (plenty, medium, few, empty). The discard pile looks untidy (slightly rotated, offset cards) and its height grows with the number of cards already played, so players see at a glance that cards have been used.

**Why this priority**: Gives the table its look and shows game progress (how many cards are left) without reading text.

**Independent Test**: Play several turns and check the card on the table, the draw pile count and level, and that the discard pile grows; switch language and theme and check the card follows.

**Acceptance Scenarios**:

1. **Given** a drawn card, **When** the table is shown, **Then** the card shows its type icon, value and localized name; before the first draw the card slot is shown empty.
2. **Given** the theme or language is switched, **When** the table is shown, **Then** card colours, contrast and text follow the new theme/language without a reload.
3. **Given** a full deck, **When** the table is shown, **Then** the draw pile shows the "plenty" level and the remaining card count.
4. **Given** the remaining cards drop below the medium and few thresholds, **When** the table updates, **Then** the draw pile shows the "medium", "few" and finally "empty" level (empty with 0 cards).
5. **Given** N cards were played, **When** the table is shown, **Then** the discard pile shows a visibly larger stack for larger N, no discard pile is shown when N is 0, and the arrangement of the cards does not change on updates.
6. **Given** the deck is reshuffled, **When** the table updates, **Then** the draw pile refills and the discard pile shrinks accordingly.

---

### User Story 3 - Dice, secured area, actions and log regrouped (Priority: P2)

Dice, the secured area (Safe) with the turn points, the action buttons (draw, throw, select, bank) and the game log are grouped sensibly around the table: dice and actions in front of the local player near the table centre, the Safe next to the dice, and the log in a separate panel that does not push the table around. All existing behaviour stays: dice rolling animation, bust display, computer picks, minimum-points hint, Street progress, disabled-reason hints, leave and settings dialogs.

**Why this priority**: Completes the new layout; existing behaviour must not regress, but the arrangement is secondary to seats and piles.

**Independent Test**: Play a full turn (draw, throw, select, bank) and a bust; compare behaviour with the previous UI.

**Acceptance Scenarios**:

1. **Given** a running turn, **When** the local player acts, **Then** draw, throw, select and bank behave exactly as before and show the same disabled reasons.
2. **Given** a bust, **When** it happens, **Then** the bust message and countdown are shown as before.
3. **Given** many log entries, **When** the log grows, **Then** it scrolls inside its panel and the table layout does not move.
4. **Given** a computer's turn, **When** it plays, **Then** the thinking hint and the highlighted dice picks are shown as before.

---

### Edge Cases

- Two players: seats are opposite each other (local player bottom, the other at the top centre).
- A player is replaced by a computer or rejoins: the seat card icon updates, position stays.
- Very long nicknames: truncated with the full name available (tooltip or accessible name); layout does not break.
- Narrow desktop windows (e.g. 1024 px): seats stay inside the table without overlapping; the mobile layout is out of scope.
- Reduced-motion preference: no extra animation is introduced by this feature.
- Game ends or the local player is removed: the existing result and removal dialogs work as before.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST show all players of a running game as seat cards around an oval table in clockwise turn order.
- **FR-002**: The local player MUST always be at the bottom centre and carry a distinct "you" highlight.
- **FR-003**: Each seat card MUST show a human/computer icon, the player's name and current score, and an offline state when disconnected.
- **FR-004**: The active player's card MUST be highlighted and MUST contain the turn timer; no other turn timer may be shown.
- **FR-005**: The seat layout MUST support 2 to 8 players, with 8 players arranged as 3 top, 3 bottom, 1 left and 1 right.
- **FR-006**: The active card MUST be shown in the table centre as a portrait card with type icon, value and localized name.
- **FR-007**: Card appearance MUST adapt to the light and dark theme with sufficient contrast, and text MUST follow the selected language (EN/DE).
- **FR-008**: The draw pile MUST show the remaining card count and one of four fill levels (plenty, medium, few, empty).
- **FR-009**: The discard pile MUST be shown as an untidy stack whose size reflects the number of played cards (total cards minus remaining minus active card); its arrangement MUST be stable across updates.
- **FR-010**: The discard pile MUST NOT require any new data from the server.
- **FR-011**: Dice, secured area, actions and log MUST remain fully functional with unchanged rules, timers, animation and messages.
- **FR-012**: The player list and the separate textual deck/active-player lines of the old layout MUST be replaced by the new elements without loss of information (target score stays visible).
- **FR-013**: All new elements MUST be keyboard accessible where interactive, have accessible names (including seat state, score, pile counts) and announce the active player to assistive technology.
- **FR-014**: The table view MUST be split into independent, separately testable UI parts: seat card, table layout, draw pile, discard pile, dice area and log, with the table view only composing them.
- **FR-015**: All new texts MUST exist in English and German.

### Key Entities

- **Seat card**: Visual representation of one player: kind (human/computer), name, score, states (you, active, offline), optional timer.
- **Table layout**: Arrangement of seat positions for 2-8 players relative to the local player.
- **Draw pile**: Remaining cards with count and fill level.
- **Discard pile**: Played cards, visualised only by count and a stable untidy arrangement.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a usability check, a player finds their own seat and the active player within 2 seconds in games of 2, 4 and 8 players.
- **SC-002**: The player whose turn it is and the owner of the running timer are identifiable at a glance in 100% of tested states (own turn, other human, computer).
- **SC-003**: Remaining cards are readable both as a number and as one of four levels, and the level matches the count thresholds in 100% of tested deck sizes (including empty and after reshuffle).
- **SC-004**: At common desktop widths (1024 px and wider) no seat, pile or action overlaps another element for 2-8 players.
- **SC-005**: All previously available turn actions and messages work as before; no existing automated acceptance test regresses.
- **SC-006**: Both themes and both languages show readable cards (text contrast meets WCAG AA).

## Assumptions

- Desktop is the focus; the mobile layout (player bar instead of the oval table) is a separate later spec.
- The fill levels derive from the remaining cards relative to the starting deck size; exact thresholds (about 2/3 plenty, 1/3 medium, otherwise few, 0 empty) are a design detail.
- The total number of cards is known from the game rules already sent to the client, so no protocol change is needed.
- The legacy card images in `docs/assets/legacy-cards` serve only as visual reference for colours and motifs; cards are rendered by the UI itself.
- Turn order is clockwise; the seat numbering in the game lobby is unchanged.
- Settings and leave dialogs, result view and rules engine are not changed.
