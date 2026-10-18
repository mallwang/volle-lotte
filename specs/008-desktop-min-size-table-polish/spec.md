# Feature Specification: Desktop Minimum Size and Table Polish

**Feature Branch**: `008-desktop-min-size-table-polish`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Desktop minimum size and table polish (roadmap R1). Find one minimum window size that works for desktop browser users and optimise the active game table for it. Includes the open accessibility items moved from spec 007 (T031, T033)."

**Design**: [design.md](design.md) (approved mockup: [mockup.html](mockup.html))

**Layout reference**: [specs/007-active-game-table-ui/design.md](../007-active-game-table-ui/design.md) (seats in two columns, own seat top left, turn order alternating right and left)

## Measurement Baseline

Measured on the shipped table (v0.0.5): real game against computer players, 2, 4 and 8 players, phases draw, throw, select and bust, Chromium, light theme, English. Coordinates are page pixels from the top of the page; "fold" is the bottom edge of the browser viewport. The layout is identical in every phase and for every player count.

| Viewport | Page height | Dice and actions end at | Secured area ends at | Visible without scrolling                               |
| -------- | ----------- | ----------------------- | -------------------- | ------------------------------------------------------- |
| 1024x640 | 916 px      | 599-604 px              | 824 px               | Cards, seats (2 and 4 players), dice, Throw / Set aside |
| 1280x650 | 916 px      | 599-604 px              | 824 px               | same                                                    |
| 1920x950 | 950 px      | 599-604 px              | 824 px               | everything                                              |

- At 1024x640 and 1280x650 the Secured area (secured dice and the "Bank points" button) ends 174-184 px below the fold. Only its heading line is visible.
- With 8 players the bottom row of seats ends at 759 px and is below the fold at 640 and 650 px.
- The board is a fixed 992x832 px; the page needs about 830 px (without the log button) or 916 px (with it) to show everything.
- Horizontally nothing is cut off at 1024 px (seat columns end at 1000 px, no horizontal scrolling). The earlier finding "seats cut off at 1024 px" from spec 007 did not reproduce and is re-checked as part of this feature.
- The game log is out of scope for this feature (it will be reworked later); it may stay below the fold.

## Clarifications

### Session 2026-10-18

- Q: Which exact minimum window size should the table support? -> A: No separate compact layout. The table is designed once for a reference size and scaled uniformly to the usable viewport; below a minimum scale factor (0.7, about 1024x640) a blocking hint is shown. The 1024x640 proposal is the result of 640 / 900 = 0.71, see FR-001.
- Q: What should the hint say? -> A: Two levels. Below the reference size a small dismissible notice says the table was scaled to fit the window; below the minimum scale a blocking "window too small" hint is shown. Scope: the game table only.
- Q: Should seat cards be keyboard focusable? -> A: No. Seat cards stay out of the tab order; no extra tab stops. Support for blind or screen-reader players is not a goal yet (the turn timers make it impractical); a later spec lets the host disable timers for such games.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - The whole play area fits and scales with the window (Priority: P1)

A player on a typical laptop or a landscape tablet opens a running game and sees the complete play area at once: all seats, the card and piles, the dice, the action buttons and the Secured area including the "Bank points" button. The table is designed once for a normal desktop screen (for example 1920x1080) and shrinks uniformly in smaller windows, so every element keeps its position relative to the others (cards on the oval, seats beside it, dice and Secured area below). They never have to scroll the page during a turn.

**Why this priority**: Today the Secured area and the "Bank points" button are hidden below the fold on small screens; banking is a core decision of every turn.

**Independent Test**: Open a running game with 2, 4 and 8 players at 1024x640, 1280x650 and 1920x950, go through draw, throw, select and bust, and check in every phase that the play area is fully visible without scrolling and that positions relative to each other are the same as at 1920x950.

**Acceptance Scenarios**:

1. **Given** a running game at any viewport between the minimum and the reference size, **When** any phase is shown (draw, throw, select, bust notice), **Then** all seats, the card with both piles, the dice, the turn actions and the Secured area including "Bank points" are fully visible without scrolling.
2. **Given** a viewport at or above the reference size (for example 1920x950), **When** the game is shown, **Then** the table looks as it does today (scale 1.0), is centred, and is not enlarged beyond that.
3. **Given** 8 players at the minimum size, **When** the table is shown, **Then** all 8 seat cards are fully visible and neither overlap each other nor the table centre.
4. **Given** the window is resized while a game is running, **When** the new size is still at or above the minimum, **Then** the table scales immediately without reloading, without losing game state and without restarting the dice animation or the turn timer.
5. **Given** a wide and flat window (for example 1366x650), **When** the table is shown, **Then** the height limits the scale and the table is centred horizontally with empty margins on both sides.

---

### User Story 2 - Clear hints when the table is scaled or the window is too small (Priority: P2)

A player whose window is smaller than the reference size sees a small notice that the table was scaled to fit the window, which they can dismiss. A player whose window is below the minimum sees a clear "window too small" message with the required minimum size instead of an unreadable table. When they enlarge the window, the table returns by itself.

**Why this priority**: Players should understand why the table looks smaller, and must not be left with an unreadable table on very small windows.

**Independent Test**: Shrink the window from the reference size down below the minimum during a running game and enlarge it again.

**Acceptance Scenarios**:

1. **Given** a running game and a window smaller than the reference size but at or above the minimum, **When** the table is shown, **Then** a small, dismissible notice in the selected language says the table was scaled to fit because the window is smaller than needed, and it does not cover any play-area element.
2. **Given** the notice was dismissed, **When** the window is resized but stays below the reference size, **Then** the notice does not come back during this visit; it appears again in a new visit.
3. **Given** a running game and a window below the minimum in width or height, **When** the table would need a scale below the minimum, **Then** a blocking "window too small" hint in the selected language names the minimum size and the table is not shown.
4. **Given** the blocking hint is shown, **When** the window is enlarged to at least the minimum, **Then** the table is shown again in the current game state without reloading, and nothing about the game on the server (other players, timers) was changed by the hint.

---

### User Story 3 - Keyboard operation and visible focus (Priority: P2)

A keyboard user can play a complete turn without a mouse. The focus position is clearly visible on every control, and the tab order follows the logical order: header, then dice and actions on the table, then the log. Seat cards are not tab stops.

**Why this priority**: Moved from spec 007 (T031); the constitution requires keyboard operability and visible focus, and the earlier walk-through found gaps (focus ring only 1 px wide, tab order puts the header after the table).

**Independent Test**: Tab through a running game at the minimum size and at the reference size in light and dark theme, in English and German, and play a turn using only the keyboard.

**Acceptance Scenarios**:

1. **Given** any interactive control on the table or in the header, **When** it receives keyboard focus, **Then** a focus indicator that is clearly visible against its background in light and dark theme is shown (more than 1 px), also at the minimum scale.
2. **Given** a running game, **When** the user tabs through the page, **Then** the order is header, table controls, then the log, and the order never jumps back and forth.
3. **Given** the local player's turn, **When** they use only the keyboard, **Then** they can draw, throw, select dice, set them aside and bank.
4. **Given** the seat cards, **When** the user tabs through the page, **Then** the seat cards add no tab stops.

---

### User Story 4 - Contrast and language checks (Priority: P3)

Text, icons and state markers on the table meet the contrast requirements in light and dark theme and in English and German. No text is cut off or overflows its box in either language at the minimum size.

**Why this priority**: Moved from spec 007 (T031/T033); the earlier check found contrast of 8.6:1 or better, so this is mainly a regression check after the layout change.

**Independent Test**: Walk through a game at 1024 px and wider with 2, 4 and 8 players in both themes and both languages and check contrast, text overflow and overlap.

**Acceptance Scenarios**:

1. **Given** any text or state marker on the table, **When** shown in light or dark theme, **Then** its contrast meets at least the level measured before this feature (8.6:1 for text) and never falls below the accessibility minimum.
2. **Given** German or English UI, **When** the table is shown at the minimum size, **Then** no label is cut off, wrapped into overlap or hidden.
3. **Given** the quickstart walk-through of spec 007, **When** it is repeated at 1024 px and wider for 2, 4 and 8 players, **Then** every step passes.

---

### Edge Cases

- A browser with large scrollbars or a visible bookmarks bar reduces the viewport; the scale is based on the usable viewport, not the screen resolution.
- Browser zoom at 125% or 150% reduces the effective viewport; the notice or the blocking hint appears when the effective viewport falls below the corresponding size.
- At the minimum scale, small text (labels, card captions, seat state) must still be readable; the minimum scale is chosen so that it is.
- At the minimum scale, buttons are about 30% smaller than today; they must stay clickable with a mouse without mis-clicks.
- The bust notice, the "not allowed" toast and the dice-rolling animation appear at any scale and must not push the Secured area or the buttons out of view.
- The Street, Star, Clover and "Double Lotte" cards change the text of the Secured area (longer status lines, carried points at stake); the longest variants in German must still fit at every scale.
- A tablet in portrait orientation is judged by the same scale rule: 768x1024 gives a scale of 0.77, so the table is shown small with empty space below it, and it is still played with the same controls. Whether a separate minimum width (for example 1024 px) should keep portrait tablets out is an open decision, see Assumptions.
- A very large window (for example 2560x1440) shows the table at scale 1.0, centred, not stretched.
- The scale must not change the position of dropdowns, dialogs and toasts so that they end up outside the window.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The game table MUST be designed for one reference size (the current board of about 992x832 px plus header, about 900 px high, shown completely on a 1920x1080 screen) and MUST be scaled uniformly to the usable viewport: scale = the smaller of (viewport width / reference width) and (viewport height / reference height), at most 1.0. All elements (seats, oval table, cards and piles, dice, actions, Secured area, notices) scale with the same factor and keep their positions relative to each other.
- **FR-002**: The minimum scale is 0.7, which corresponds to a viewport of about 1024x640 (landscape tablets and 1366x768 laptops with 620-650 px of browser height). The cut-off itself follows from the reference size: 992 x 0.7 = 695 px wide and 900 x 0.7 = 630 px high. Below it the table is not shown (FR-006), and the hint names these two values. The value is recorded here and in the roadmap.
- **FR-003**: At or above the minimum scale, in every phase (draw, throw, select, bust notice) and for 2 to 8 players, the whole play area MUST be visible without scrolling: all seat cards, the active card with both piles, the dice, the turn actions and the Secured area including the "Bank points" button.
- **FR-004**: The table MUST NOT overflow horizontally at any scale, and seat columns MUST NOT be cut off at the left or right edge (re-check of the spec 007 finding with a visible scrollbar).
- **FR-005**: Below the reference size and at or above the minimum scale, the system MUST show a small notice in the selected language that the table was scaled to fit the window. The notice MUST be dismissible, MUST NOT cover any play-area element, and MUST NOT reappear after dismissing during the same visit.
- **FR-006**: Below the minimum scale the system MUST show a blocking "window too small" hint in the selected language that states the minimum size, and MUST show the table again without reloading as soon as the window is large enough.
- **FR-007**: Scaling and hints MUST NOT change or interrupt the game on the server; turn timers and other players continue as before. A resize MUST NOT restart the dice animation, the bust notice timer or the turn timer.
- **FR-008**: All interactive controls on the table and in the header MUST show a focus indicator that is clearly visible in light and dark theme and thicker than the current 1 px ring, also at the minimum scale.
- **FR-009**: The keyboard tab order MUST be: header first, then the table controls, then the log; no control may be skipped or visited out of order. Seat cards MUST NOT be tab stops.
- **FR-010**: A complete turn (draw, throw, select, set aside, bank) MUST be possible with the keyboard alone.
- **FR-011**: Text and state markers on the table MUST keep a contrast ratio of at least 8.6:1 for body text in both themes at every scale, and non-text state markers MUST remain distinguishable without relying on colour alone.
- **FR-012**: In English and German, no label or status text on the table may be cut off or overlap other elements at any scale, including the longest Secured-area status texts, and the smallest text MUST stay readable at the minimum scale.
- **FR-013**: Existing game behaviour MUST remain unchanged: dice rolling animation, bust notice, computer picks, minimum-points hint, Street progress, disabled-reason hints, settings and leave dialogs, turn timer inside the active seat.
- **FR-014**: The game log is out of scope; its position and size MAY stay as today, even if it is below the fold at the minimum size.

### Key Entities _(include if feature involves data)_

- **Reference size**: The design size of the table in pixels (about 992x832 plus header), shown unscaled on a normal desktop screen.
- **Table scale**: The uniform factor between the minimum scale (0.7) and 1.0 that follows the usable viewport.
- **Measurement table**: A fixed matrix of viewport sizes (1024x640, 1280x650, 1920x950), phases (draw, throw, select, bust) and player counts (2, 4, 8) that records where each play-area element ends relative to the viewport. Repeated after the change to prove FR-003.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In the repeated measurement table (3 viewport sizes x 4 phases x 3 player counts), 100% of the play-area elements (seats, card and piles, dice, actions, Secured area and "Bank points") end at or above the bottom edge of the viewport at the minimum size and at every larger size measured.
- **SC-002**: The relative position of every play-area element (measured as a fraction of the table size) differs by at most 1% between 1024x640, 1280x650 and 1920x950.
- **SC-003**: A player can complete a full turn (draw, throw, select, bank) at 1024x640 without scrolling once.
- **SC-004**: Shrinking the window below the minimum shows the blocking hint within 1 second, and enlarging it again restores the table within 1 second without a reload, in 100% of tries.
- **SC-005**: A complete turn can be played with the keyboard alone, and every interactive control shows a focus indicator that is clearly visible in both themes (verified by a tab-through in light/dark and English/German).
- **SC-006**: The quickstart walk-through of spec 007 passes at 1024 px and wider for 2, 4 and 8 players in both themes and both languages, with no overlap, no cut-off or unreadable text and no horizontal scrolling.
- **SC-007**: After the change a short manual smoke test of a complete game (lobby, play, bust, bank, reconnect) shows no regression compared to v0.0.5.

## Assumptions

- The target remains desktop browsers and landscape tablets; phones and a dedicated mobile layout are out of scope (roadmap R3).
- The minimum size refers to the usable browser viewport (excluding browser chrome), not the screen resolution.
- The measurements and the repeated measurement are done with throw-away scripts in a headless browser; a permanent end-to-end suite is out of scope (roadmap R2).
- The "Invalid PrimeUI License" banner seen in development without a licence key is a local setup issue (key set through the environment) and not part of this feature.
- The game log is reworked in a later spec; this feature does not depend on its position.
- The manual two-browser run of spec 002 (T045) is closed as covered by the e2e flows and is not part of this feature; only a short manual smoke test is done at the end.
- The scale only reduces the table; it is not a separate compact layout. Whether the header scales with the table or keeps its size is decided in the plan.
- Screen-reader and blind-player support is not a goal of this feature; the turn timers make it impractical. A later spec lets the host disable timers for such games.
- The notice about scaling and the blocking hint apply to the game table only; other screens (nickname, lobby, create game, game lobby) keep their current behaviour.
- Open decision: a separate minimum width (for example 1024 px) is not part of the rule; with the scale rule alone portrait tablets (768x1024, scale 0.77) still show the table. To be decided before planning.
- The minimum scale of 0.7 is confirmed or adjusted after checking the readability of the smallest text at 1024x640 during implementation; a change would be recorded here.
