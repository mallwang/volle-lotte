# Feature Specification: Mobile Lobby and Game Setup

**Feature Branch**: `022-mobile-lobby`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Mobile lobby and game setup (M1 in docs/mobile-roadmap.md). A phone user can enter a game from the mobile app: nickname and session flow, game list, create and join, host settings, seats, computer players, ready state and start, all usable on narrow screens with touch."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Sign in and browse games on a phone (Priority: P1)

As a phone user, I want to enter a nickname and see the list of games, so that I can find a game to join or decide to host my own.

**Why this priority**: The nickname and game list are the entry point to everything else; without them no other mobile flow is reachable.

**Independent Test**: Open the mobile application on a phone-sized screen, enter a nickname, and verify the game list shows every game with its name, host, target score, free seats and protection state, and offers the create action.

**Acceptance Scenarios**:

1. **Given** a first visit with no stored session, **When** the user opens the mobile application, **Then** they are asked for a nickname and, after submitting a valid one, reach the game list.
2. **Given** a returning user with a stored session, **When** they open the mobile application, **Then** they reach the game list without entering the nickname again.
3. **Given** games exist in various states (open, full, password protected, running), **When** the user views the list, **Then** each game shows its status and only the actions that apply to it, and a game with no free seats offers no join action.
4. **Given** the list is empty, **When** the user views it, **Then** an empty-state message and the create action are shown.
5. **Given** an invalid or already taken nickname, **When** the user submits it, **Then** the same explanatory error as on desktop is shown and the user can correct it.

---

### User Story 2 - Create a game and get ready (Priority: P1)

As a phone user, I want to create a game, configure it, fill seats and start, so that I can host a game from my phone.

**Why this priority**: Hosting is the first acceptance criterion of M1 and exercises the full setup surface (settings, seats, computer players, ready, start).

**Independent Test**: On a phone, create a game with a name and optional password, adjust settings, add a computer player, mark ready, and start once another player is present; verify every control is reachable and operable by touch.

**Acceptance Scenarios**:

1. **Given** the user is on the game list, **When** they choose create, **Then** a form offers the same name, password, seat count, rules and computer-player options as desktop, with the primary submit action always reachable.
2. **Given** the user submits the form, **When** the game is created, **Then** they land in the game's lobby as host with their own seat.
3. **Given** the user is host in the lobby, **When** they add or remove computer players, set computer difficulty and risk, lock or unlock a seat, remove a player, or change game settings, **Then** each change is applied and visible to all players as on desktop.
4. **Given** the user is host, **When** the start conditions are met, **Then** the start action is enabled and starting follows the same confirmation behavior as desktop.
5. **Given** the user is in the lobby, **When** they mark themselves ready or withdraw readiness, **Then** their state updates for everyone.

---

### User Story 3 - Join a game hosted by someone else (Priority: P1)

As a phone user, I want to join a game hosted by a desktop user and become ready, so that I can play with others without a computer.

**Why this priority**: Joining a desktop-hosted game is the second acceptance criterion and proves cross-client compatibility.

**Independent Test**: Host a game on desktop, join it from the phone (with a password if protected), and mark ready; verify the desktop host sees the phone player seated and ready.

**Acceptance Scenarios**:

1. **Given** an open game with a free seat, **When** the user chooses join, **Then** they are seated and shown the lobby.
2. **Given** a password-protected game, **When** the user chooses join, **Then** they are asked for the password, and a wrong password or a temporary lockout is explained as on desktop.
3. **Given** the user is seated in someone else's lobby, **When** they view it, **Then** they see all seats, names, ready states and the current game settings read-only, and can mark ready or leave.
4. **Given** the user is banned from a game, **When** they view the list, **Then** they see the same banned notice as on desktop and no join action.
5. **Given** the host changes seats or settings, **When** the change happens, **Then** the phone lobby reflects it without a manual refresh.

---

### User Story 4 - Operate everything with touch on narrow screens (Priority: P2)

As a phone user, I want every lobby screen to fit my screen with labeled, touch-sized controls, so that I never need to zoom or scroll sideways.

**Why this priority**: This is the cross-cutting quality bar of M1 (third acceptance criterion); it is verified across the stories above rather than delivering a separate flow.

**Independent Test**: Walk through each lobby screen at the smallest supported viewport with the longest allowed names and the longest translation, and verify no horizontal scrolling and no hidden or clipped primary action.

**Acceptance Scenarios**:

1. **Given** any lobby screen at a supported viewport size, **When** it is displayed, **Then** the page has no horizontal scrolling and no zoom is needed to read or use primary controls.
2. **Given** long game names, nicknames, or computer names, **When** they are displayed, **Then** they wrap or truncate visibly without pushing actions off screen.
3. **Given** either supported language, **When** screens are displayed, **Then** labels and button texts are fully readable and all actions remain visible.
4. **Given** a phone in landscape orientation, **When** the user is in the lobby, **Then** the screens remain usable and the primary actions remain reachable.
5. **Given** the on-screen keyboard is open while editing a field, **When** the user needs to submit, **Then** the submit action can still be reached.

### Edge Cases

- The connection drops while in the list or lobby: the user sees that the connection is lost and recovers into the same screen when it returns (full reconnect polish is M3; M1 must not leave a blank or stuck screen).
- The game is full, closed, or started by the host while the user is on the join dialog: the user gets the same error as on desktop and returns to the list.
- The host leaves or is replaced: the new host sees host controls and everyone sees the host change notice.
- The user is removed from the lobby by the host: they return to the list with an explanation.
- The game starts: the mobile application acknowledges the start and does not show a broken screen, even though the phone game table is delivered in M2.
- A nickname or game name at the maximum allowed length.
- Opening or refreshing a nested mobile route directly restores the matching screen or falls back to the list.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The mobile application MUST let a user enter a nickname and establish a session with the same validation, errors and session persistence as the desktop application.
- **FR-002**: The mobile application MUST show the game list with name, host, target score, seat usage, protection state and status for each game, and update it live.
- **FR-003**: Users MUST be able to create a game from the mobile application with the same options as desktop (name, optional password, seats, rules, computer players).
- **FR-004**: Users MUST be able to join a game with a free seat, including entering a password for protected games, with the same lockout and error behavior as desktop.
- **FR-005**: The lobby MUST show all seats with player or computer names, ready state, lock state and host marker, and update live.
- **FR-006**: A host MUST be able to change game settings, add and remove computer players, set computer difficulty and risk, lock and unlock seats, remove a player, and start the game, with the same rules for when each is allowed as on desktop.
- **FR-007**: Every seated user MUST be able to mark ready, withdraw readiness and leave the lobby.
- **FR-008**: Non-hosts MUST see game settings read-only.
- **FR-009**: Primary actions (create, join, submit, ready, start, leave) MUST be visible and labeled with text, and each touch target MUST be large enough for reliable finger use.
- **FR-010**: No lobby screen MUST require horizontal page scrolling or browser zoom at any supported viewport size, in portrait and landscape.
- **FR-011**: Long names and translated texts MUST NOT hide, clip or push off screen any primary action.
- **FR-012**: The mobile application MUST support both existing languages, using the same translations where the text is shared.
- **FR-013**: Starting a game MUST lead to a defined state on the phone (a clear notice that the phone game table is not yet available) until M2 delivers the table.
- **FR-014**: The desktop and tablet application MUST remain unchanged in behavior and appearance.
- **FR-015**: Mobile lobby behavior MUST follow the server's authority; the mobile application MUST NOT apply lobby changes locally before the server confirms them.

### Key Entities

- **Session**: A nickname-bound identity that persists across visits; shared with desktop.
- **Game summary**: Name, host, target score, seat usage, protection, status and the viewer's relationship to it (banned, rejoinable, closable, spectatable).
- **Lobby seat**: A player or computer slot with name, ready state, lock state, and for computers difficulty and risk.
- **Game settings**: Host-controlled rules and parameters set at creation or in the lobby.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A tester can go from opening the mobile application to a created game with themselves ready in under 2 minutes, without zoom or horizontal scrolling.
- **SC-002**: A tester can join a desktop-hosted game and become ready in under 1 minute, and the desktop host sees the phone player seated and ready.
- **SC-003**: At the smallest supported viewport, 100% of lobby screens have no horizontal page scrolling and all primary actions visible, with maximum-length names and the longest translations.
- **SC-004**: Every lobby capability available to a desktop host or player has a touch-operable equivalent on the phone, except those explicitly listed as out of scope.
- **SC-005**: Existing desktop and tablet behavior is unchanged: the existing desktop automated checks pass without modification to their expectations.

## Assumptions

- M0 (spec 021) is delivered: the mobile application is reachable at `/m/` and connects to the same API and WebSocket as desktop.
- The initial supported viewport range is 320 to 480 CSS pixels wide in portrait, plus the same devices in landscape; tablets and desktop keep using the existing application.
- Supported browsers for this increment are current mobile Chrome and Safari; the formal support matrix is decided in the plan.
- The mobile application reuses the existing nickname, session and protocol behavior and shares only client-neutral logic, as established in M0.
- Out of scope: the phone game table and game actions (M2); spectating, rejoining or ending running games, game over, rematch, game log and polished reconnect and accessibility work (M3); installability and update handling (M4); Capacitor and Android (M5).
- Settings presets that exist in the desktop lobby are treated as part of host settings and are included if they are usable on narrow screens without extra design work; otherwise they are deferred and noted in the plan.
- Running games in the list are shown with their status only; their rejoin, end and watch actions arrive with M2 and M3.
