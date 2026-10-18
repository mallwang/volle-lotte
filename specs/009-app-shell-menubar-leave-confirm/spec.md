# Feature Specification: App Shell Navbar and Leave-Game Confirmation

**Feature Branch**: `009-app-shell-menubar-leave-confirm`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "App shell with PrimeNG Menubar and leave-game confirmation. Rework the global app shell around a navigation bar, show every subpage link with the open page highlighted, ask for confirmation before leaving a running game or a game lobby, simplify the theme toggle to light and dark, and optionally modernise the create-game form."

## Scope

In scope: the app header and navigation, the "leave game" confirmation (table and game lobby), the theme toggle, and (lowest priority) the create-game form.

Explicitly out of scope, not to be changed by this feature:

- The scale logic and the fixed-size stage (scaling, scale notice, "window too small" hint).
- The game table, the dice and all domain-specific components (seats, cards, piles, dice, turn timer). They stay custom.
- The game log. It will be reworked later.
- The open-games list in the lobby. It will be reworked completely later.
- A browser prompt when closing the tab or reloading the page.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - One navigation bar with all pages and the current page highlighted (Priority: P1)

A signed-in player sees a single navigation bar at the top of every screen. It shows the brand (logo, name, version) on the left, links to all main pages in the middle, and the language and theme controls on the right. The link of the page that is currently open is visibly highlighted. While a game is running or being prepared, the links stay visible and an extra entry leads back to that current game.

**Why this priority**: The navigation is the base of the whole shell rework; the leave confirmation and the theme toggle plug into it. Today the links disappear while a game exists, so players cannot tell where they are or how to get back.

**Independent Test**: Sign in, open each page in turn (games, create game, current game) and check that every link is visible, the open page is highlighted and no other link is. Repeat while in a game lobby and in a running game.

**Acceptance Scenarios**:

1. **Given** a signed-in player without a game, **When** they open the games page, **Then** the bar shows "Games" and "Create game", and "Games" is highlighted.
2. **Given** the same player, **When** they open the create-game page, **Then** only "Create game" is highlighted.
3. **Given** a player who is in a game lobby or a running game, **When** any page is shown, **Then** the links are still visible and an extra "Current game" entry is shown; it is highlighted while the game page is open.
4. **Given** a player without a game, **When** the bar is shown, **Then** no "Current game" entry is present.
5. **Given** a visitor who has not chosen a nickname yet, **When** the nickname page is shown, **Then** the brand, language and theme controls work, and the page links are disabled or hidden so that no signed-in page can be reached from the bar.
6. **Given** the bar is shown, **When** the user navigates with the keyboard only, **Then** every entry and control can be reached and activated and the focus is visible.

---

### User Story 2 - Confirmation before leaving a game or lobby (Priority: P1)

A player who is in a running game, or in a game lobby, and who tries to go somewhere else gets a modal asking them to confirm first. The text tells them what will happen: they leave the running game, the planned game is cancelled (host), or they leave the lobby (guest). Only after they confirm are they removed from the game and taken to the target page. Finished games (result screen) show no warning.

**Why this priority**: Leaving by accident (a stray click on the navigation or the browser's back button) ends a game for the player, or cancels the whole game for everybody if the host does it. This gets more likely once the links stay visible in a game (story 1).

**Independent Test**: Start a game against computers and click a navigation link: the modal appears; "Stay" keeps the game, "Leave" ends it and opens the target page. Repeat in a lobby as host and as guest, via the browser's back button and via the existing "Leave game" buttons.

**Acceptance Scenarios**:

1. **Given** a running game, **When** the player clicks another page link, **Then** a modal asks whether to leave the running game and the player stays on the table until they decide.
2. **Given** the modal is open, **When** the player chooses to stay, **Then** the modal closes and nothing else changes (game state, timers and dice animation continue).
3. **Given** the modal is open, **When** the player confirms, **Then** they leave the game and the page they clicked is shown (not the lobby, not twice).
4. **Given** a game lobby and the player is the host, **When** they try to leave, **Then** the modal says that the planned game will be cancelled.
5. **Given** a game lobby and the player is a guest, **When** they try to leave, **Then** the modal says that they leave the lobby; the game stays for the others.
6. **Given** a running game or a lobby, **When** the player uses the browser's back button, **Then** the same modal appears; staying keeps them on the game page.
7. **Given** a running game or a lobby, **When** the player uses the existing "Leave game" / "Withdraw" button, **Then** the same modal (same look, same texts per situation) appears. There is exactly one leave-confirmation in the app.
8. **Given** the result screen of a finished game, **When** the player clicks a page link or "back", **Then** no modal is shown and they leave immediately.
9. **Given** the modal is open, **When** the player presses Escape, **Then** it counts as "stay". Focus moves into the modal and returns to the previous control afterwards.

---

### User Story 3 - Light and dark theme toggle (Priority: P2)

The theme control switches between light and dark only; there is no "system" state. The first time a visitor arrives, the initial theme follows their device preference once; after they have toggled, their explicit choice is remembered. Each click visibly changes the page.

**Why this priority**: With three states, the first click often changed nothing (the system theme already matched), which confused players. Small, self-contained change.

**Independent Test**: With the device in dark mode and no stored choice, the app opens dark; one click makes it light, the next dark again; after a reload the last choice is kept.

**Acceptance Scenarios**:

1. **Given** no stored choice and a device preferring dark, **When** the app opens, **Then** the dark theme is shown; with a light device preference the light theme is shown.
2. **Given** either theme, **When** the player clicks the theme control, **Then** the page switches to the other theme immediately.
3. **Given** a stored choice and a different device preference, **When** the app opens, **Then** the stored choice wins.
4. **Given** a previously stored "system" value from an older version, **When** the app opens, **Then** it is treated as "no stored choice" (the device preference decides) and nothing breaks.
5. **Given** the control, **When** a screen-reader user reaches it, **Then** its name states the current theme and the action it performs, in the current UI language.
6. **Given** the interface language is English or German, **When** the control is shown, **Then** there is no "system" wording left anywhere in the UI or the user documentation.

---

### User Story 4 - Create-game form with consistent form controls (Priority: P3)

The create-game form uses the same form look as the rest of the shell (labels, numeric inputs, validation messages) instead of hand-made field markup. Behaviour and options of the form stay as they are.

**Why this priority**: Visual and code consistency only. It can be dropped without affecting stories 1-3.

**Independent Test**: Create a game with every option once before and once after; the resulting game settings are identical and validation errors are still shown next to the field.

**Acceptance Scenarios**:

1. **Given** the create-game page, **When** the player fills in and submits the form, **Then** the created game has exactly the chosen settings, as before.
2. **Given** an invalid entry, **When** the player submits, **Then** an error message is shown at the field and the game is not created.
3. **Given** the form, **When** it is used with keyboard or screen reader, **Then** every field has a label, and the tab order follows the visual order.

---

### Edge Cases

- The player is removed from a game by the host, the game is cancelled by the host, or the connection is lost while the modal is open: the modal closes, no stale leave request is sent and the player ends up on the usual page for that situation.
- The player confirms but the server rejects the leave request: they stay where they are and see an error message; the navigation does not happen.
- Clicking the link of the page that is already open does nothing and shows no modal.
- A second navigation attempt while the modal is open does not stack a second modal.
- The game ends (result screen) while the modal is open: the modal closes and the player is not asked again.
- A game exists but the player opens the games page through a direct address: the same confirmation applies as for a link.
- Narrow windows: the bar keeps all entries reachable at the minimum supported window size.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST show one navigation bar on every screen with the brand (logo, name, version) at the start and the language and theme controls at the end.
- **FR-002**: The bar MUST list a link to every main page the signed-in player can open (games, create game) and MUST keep them visible while the player is in a game lobby or a running game.
- **FR-003**: The bar MUST highlight exactly the entry of the currently open page, and MUST convey the highlight to assistive technology as well (not by colour alone).
- **FR-004**: While the player has a game, the bar MUST show an additional "Current game" entry that opens it; without a game, the entry MUST be absent.
- **FR-005**: Before the player has a nickname/session, the bar MUST NOT allow reaching signed-in pages; brand, language and theme controls MUST keep working.
- **FR-006**: Leaving a running game, or a game lobby, by any means inside the app (navigation entry, browser back/forward, direct page address, in-page "Leave game"/"Withdraw" button) MUST require confirmation in a modal.
- **FR-007**: The modal text MUST differ per situation: leaving a running game; cancelling a planned game (host in lobby); leaving a lobby (guest). It MUST be available in English and German.
- **FR-008**: The modal MUST offer "stay" (default, also Escape) and "leave". Staying MUST leave the game and the page untouched.
- **FR-009**: On "leave" the player MUST be removed from the game and then taken to the requested target, exactly once; for in-page buttons the target is the games page.
- **FR-010**: The result screen of a finished game MUST NOT ask for confirmation.
- **FR-011**: The app MUST contain a single leave-confirmation used by the table and the game lobby; the separate confirmation dialog in the table is removed.
- **FR-012**: The theme control MUST toggle only between light and dark; the "system" state and its wording MUST be removed from the UI, the translations and the user documentation.
- **FR-013**: With no stored choice, the initial theme MUST follow the device preference once; an explicit choice MUST be stored and win on later visits. An old stored "system" value MUST be treated as no stored choice.
- **FR-014**: The theme control MUST use standard icons for sun and moon instead of custom drawn graphics and MUST have an accessible name that includes the current theme.
- **FR-015**: The create-game form MUST keep all current options, defaults, validation and results while using the shared form look (labels, numeric inputs, validation messages). _(Priority P3; may be postponed without blocking the rest.)_
- **FR-016**: The navigation bar, the modal and the theme control MUST work in light and dark theme, in English and German, with contrast and focus visibility on par with the existing screens.
- **FR-017**: The feature MUST NOT change the scaling behaviour, the game table, the dice, the game log or the open-games list.

### Key Entities

- **Navigation entry**: label, target page, whether it is currently highlighted, whether it is available (signed in / has a game).
- **Leave situation**: one of "running game", "lobby as host", "lobby as guest", "finished game" (no confirmation); decides the modal text and whether a modal is shown at all.
- **Theme choice**: light or dark; either derived from the device preference once or explicitly stored.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On every screen of a signed-in player, 100% of the main page links are visible and the open page is the only highlighted entry (checked on games, create game and current game, in light and dark).
- **SC-002**: In all four leave situations through all entry points listed in FR-006, the confirmation appears in 100% of the cases for running games and lobbies, and in 0% for finished games.
- **SC-003**: Leaving an unwanted game by accident is no longer possible with a single click or key press; a deliberate leave takes at most two interactions (trigger, confirm).
- **SC-004**: Every theme click changes the visible theme (no "no-op" clicks), verified for both initial device preferences.
- **SC-005**: No "system theme" wording remains in the UI, translations or user documentation.
- **SC-006**: The bar and the modal can be fully used with the keyboard only, and have no new accessibility findings in the existing automated and manual checks.
- **SC-007**: No visible or behavioural change on the game table, dice, game log, open-games list and scaling (existing automated tests for these areas pass unchanged).

## Assumptions

- The main pages are exactly the ones that exist today (games, create game, the game page); further pages, such as a profile or history, will get their own entries when they are added.
- The language selection stays a dropdown in the bar's end area; its behaviour and the list of languages do not change.
- The "Current game" entry opens the game page for the game the player is in, whatever its phase.
- Guests and the host can both see the leave situation; the host is the player who created the game.
- Reloading or closing the browser tab is not intercepted; the existing reconnect behaviour keeps handling it.
- Existing stored theme values other than "light" and "dark" are ignored.
- The version shown next to the brand is the same value as today.
