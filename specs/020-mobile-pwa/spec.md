# Feature Specification: Mobile PWA

**Feature Branch**: `020-mobile-pwa`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Create a mobile version of Volle Lotte because the lobby controls are not usable on small screens and the game table currently shows that it has been adjusted to fit the window. Mobile usability is the highest priority. The solution should be an installable PWA, use a separate frontend, and use Capacitor."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Use the lobby on a phone (Priority: P1)

As a phone user, I want to find, create, join, and configure games in a mobile lobby, so that I can start playing without switching to a larger screen.

**Why this priority**: The lobby is the entry point to every game, and its controls are currently difficult to discover and use on a phone.

**Independent Test**: On a phone-sized viewport, create or join a game, set up the lobby, and reach the ready state using touch controls.

**Acceptance Scenarios**:

1. **Given** a phone user opens the app, **When** they view the lobby, **Then** primary actions and their icons or labels are visible, understandable, and reachable without desktop zoom.
2. **Given** a phone user wants to play, **When** they create or join a game and configure its available settings, **Then** the complete flow can be performed using touch input.
3. **Given** a lobby contains long game names or a full set of player seats, **When** it is viewed on a narrow screen, **Then** content remains readable and controls do not overlap or become unreachable.

### User Story 2 - Play a complete game on a phone (Priority: P1)

As a player, I want to play every turn on my phone, so that a small screen does not limit or interrupt the game.

**Why this priority**: Mobile access is the highest-priority product need, and the game table is the core experience.

**Independent Test**: Join a running game on a phone and complete a full turn, including selecting dice and choosing a turn action, without browser zoom or a desktop-only layout warning.

**Acceptance Scenarios**:

1. **Given** a player opens a running game on a phone, **When** the table appears, **Then** it presents a layout designed for a phone rather than a desktop table scaled to fit the window.
2. **Given** it is the player's turn, **When** they tap dice and choose the available turn actions, **Then** each action is understandable and operable by touch.
3. **Given** the phone changes between portrait and landscape while a game is running, **When** the table relayouts, **Then** the current game state and turn remain intact and the player can continue.
4. **Given** a game is played with the largest supported number of seats, **When** the table is viewed on a phone, **Then** the active player's information and turn controls remain distinguishable and usable.
5. **Given** the network drops during a game, **When** the player reconnects, **Then** they can resume the existing game using the current reconnect behavior.

### User Story 3 - Install and safely update the mobile app (Priority: P2)

As a phone user, I want to install the game on my home screen and receive updates safely, so that it is easy to return to the game without disrupting a running match.

**Why this priority**: Installation makes the mobile experience feel at home on a phone, while safe updates preserve ongoing games.

**Independent Test**: Install the app from a supported mobile browser, open it from the home screen, and verify that an update does not interrupt an active game.

**Acceptance Scenarios**:

1. **Given** a supported mobile browser, **When** a user chooses to install the app, **Then** the installed app has an appropriate name and icon and opens the mobile experience.
2. **Given** an update is available while a game is running, **When** the player continues the game, **Then** the update does not reload or interrupt that game.
3. **Given** an update is available in a lobby or after a game, **When** the app is updated, **Then** the user can proceed with a client compatible with the server's game protocol.
4. **Given** the browser does not support installation, **When** the user opens the app, **Then** they can still use the mobile experience in the browser.

### Edge Cases

- A narrow phone viewport or browser controls reduce the available height while the user is in a lobby or game.
- Long player names, game names, and translated labels must not hide primary actions.
- A player rotates the phone during a turn or an animation.
- The network is unavailable or drops while the user is opening a game or playing.
- A mobile browser does not support home-screen installation or a required PWA capability.
- A protocol update is required while a game is in progress.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The product MUST provide a dedicated mobile experience for phones while preserving the existing desktop and tablet experience.
- **FR-002**: Phone users MUST be able to access the mobile experience from the product's public address.
- **FR-003**: The mobile lobby MUST expose the primary actions needed to browse, create, join, configure, and ready a game.
- **FR-004**: Lobby actions MUST remain identifiable and operable on narrow phone screens without requiring browser zoom.
- **FR-005**: The mobile game table MUST present the game as a phone-oriented layout and MUST NOT present the desktop small-window resize notice as a substitute for a mobile layout.
- **FR-006**: Players MUST be able to perform all available game actions using touch input, including selecting dice and choosing turn actions. Touch targets MUST be large enough to activate reliably without overlapping adjacent actions.
- **FR-007**: The mobile experience MUST support both portrait and landscape orientation without losing the current game state.
- **FR-008**: The game table MUST keep the active player's information and available turn actions distinguishable when a game has the maximum supported number of seats.
- **FR-009**: Mobile and desktop users MUST be able to participate in the same lobbies and games.
- **FR-010**: The mobile app MUST be installable from supported mobile browsers and provide its own app name, icon, and launch experience.
- **FR-011**: The mobile app MUST keep a running game uninterrupted while a new version is available.
- **FR-012**: Before a user enters or resumes a game, the app MUST ensure that the client is compatible with the server's protocol version.
- **FR-013**: The app MUST provide a usable browser experience when installation is unavailable.
- **FR-014**: The mobile experience MUST communicate loss of connectivity and allow the player to recover using the existing reconnect behavior.

### Key Entities

- **Mobile app installation**: A phone user's installed shortcut and its app identity, associated with the mobile experience.
- **Game session**: The existing shared lobby or running game that mobile and desktop players can enter.
- **Client version**: The version of the mobile experience that must remain compatible with the server during a game.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At viewport widths from 320 to 430 CSS pixels, users can complete the primary lobby flow without horizontal page scrolling or browser zoom.
- **SC-002**: At viewport widths from 320 to 430 CSS pixels, a player can complete a turn without horizontal page scrolling or a desktop small-window resize notice.
- **SC-003**: All primary lobby and game actions are visible or reachable and operable using touch at 320 x 568, 360 x 800, and 390 x 844 CSS-pixel viewports in portrait and their corresponding landscape orientations.
- **SC-004**: A user can install and launch the mobile experience from each supported mobile browser's home-screen installation flow.
- **SC-005**: In update testing, no available update interrupts an active game, and a client with an incompatible protocol cannot enter or resume a game.
- **SC-006**: Mobile and desktop players can complete the same create-or-join and gameplay flows in a shared game.

## Assumptions

- The primary target is phone-sized screens; the existing desktop and tablet experience remains unchanged.
- The mobile experience uses the existing multiplayer service and game behavior; it does not introduce a separate game network or account system.
- Multiplayer play requires an internet connection. Offline play is not part of this feature.
- Native app store releases and native-only device features are outside this feature's scope.
- The mobile app is available at the existing public address; the precise selection or routing behavior is settled during planning.
