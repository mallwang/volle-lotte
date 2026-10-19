# Feature Specification: Remembered Settings and Presets

**Feature Branch**: `015-remembered-settings`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Implement roadmap item R10. The lobby form remembers the last nickname, player count, computer seats (skill, risk, speed) and game options on the device. The host can save the current game settings under a name as a preset, in the lobby or on the create-game page, and later load all of them at once with a 'Load preset' button. Details (storage, limits, rename and delete) are not yet specified; open question: whether a 'reset to defaults' button is needed."

## Scope

In scope: remembering the last used setup on the device and pre-filling the next new game with it; named presets that the host saves, loads and deletes, available on the create-game page and in the game lobby; a "Reset to defaults" action on the create-game page; English and German texts, user documentation and roadmap update.

Out of scope: accounts or syncing across devices or browsers (the data stays on the device), remembering the game name or the game password, renaming presets, exporting or importing presets, sharing presets with other players, new game options (R9 and R20 add options later and must be picked up by this feature without redesign), any change to game rules or computer behaviour, remembering per-game settings of a game that is already running.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - The next game starts with my last setup (Priority: P1)

A host who plays regularly creates a game. The create-game page already shows the player count and the game options (target score, minimum points, four-of-a-kind doubling, cards per type) of their previous game, and their nickname is already filled in. After creating the game, the lobby already contains the computer seats (skill, risk) and the computer speed that the host used last time. The host only has to wait for the other players and start.

**Why this priority**: This is the core value: hosts stop re-entering the same setup before every game.

**Independent Test**: Create a game with 6 seats, a changed target score and two computers of different skill and risk, with a changed computer speed, and start it. Open the create-game page again: it shows 6 seats and the changed rules. Create the game: the lobby shows the two computers with the same skill and risk and the same speed.

**Acceptance Scenarios**:

1. **Given** a host who started a game with a custom setup on this device, **When** they open the create-game page again, **Then** player count and all game options show the values of that game.
2. **Given** the same host, **When** they create the new game, **Then** the lobby contains the computer seats (skill, risk) of the last started game in the first free seats, and the computer speed has the remembered value.
3. **Given** a device that has never been used for a game, **When** the create-game page opens, **Then** it shows the default values and the lobby starts with no computers and the default speed.
4. **Given** a returning player, **When** they open the nickname page, **Then** the last used nickname is filled in.
5. **Given** a host who changed settings in the lobby but left without starting, **When** they create the next game, **Then** the remembered setup is still that of the last game that was started.

---

### User Story 2 - Save and load a named preset (Priority: P2)

A host plays in different groups, for example "Family, target 4000, two easy computers" and "Friday round, 8 seats, house rules". On the create-game page or in the game lobby, the host saves the current settings under a name. Later, a "Load preset" button lists the saved presets; choosing one applies all of its settings at once. The host can also delete presets they no longer need.

**Why this priority**: Remembering only the last setup does not help hosts who alternate between a few setups.

**Independent Test**: On the create-game page set 8 seats and a target score of 3000, save the preset "Friday". Change the values, press "Load preset" and choose "Friday": 8 seats and 3000 are back. Delete "Friday": it no longer appears in the list.

**Acceptance Scenarios**:

1. **Given** the create-game page, **When** the host saves the current settings under a name, **Then** the preset appears in the "Load preset" list on both the create-game page and the game lobby.
2. **Given** saved presets, **When** the host chooses one on the create-game page, **Then** player count and all game options are replaced by the preset's values at once, and the computer seats and speed of the preset are used for the game that is created next.
3. **Given** a game lobby in which the host chose a preset, **When** it is applied, **Then** the computer seats and the computer speed of the preset are applied to the lobby; the player count and the game options of the running room stay as they are, because they cannot be changed after creation.
4. **Given** the lobby already has humans seated, **When** a preset with more computers than free seats is applied, **Then** the computers that fit are added and the host is told that some did not fit; seated humans and their order are never changed.
5. **Given** a saved preset, **When** the host deletes it, **Then** it disappears from the list and nothing else changes.
6. **Given** an existing preset name, **When** the host saves under the same name again, **Then** the host is asked to confirm and the preset is replaced; no duplicate is created.
7. **Given** a preset was saved, **When** the host starts a game, **Then** the game name and password are not part of it.

---

### User Story 3 - Go back to the defaults (Priority: P3)

After experimenting with many options, the host wants the standard setup back. A "Reset to defaults" action on the create-game page restores player count and all game options to the defaults, and clears the remembered computer seats and speed for the next game. Saved presets are not touched.

**Why this priority**: Without a way back, remembered values can become a trap, especially when the host no longer knows which options were changed.

**Independent Test**: Change several options, press "Reset to defaults": all fields show the default values, and the lobby of the next created game has no computers and the default speed.

**Acceptance Scenarios**:

1. **Given** changed values on the create-game page, **When** the host chooses "Reset to defaults", **Then** player count and all game options show the defaults.
2. **Given** a reset, **When** the host creates the game, **Then** the lobby has no pre-filled computers and the default speed.
3. **Given** saved presets, **When** the host resets to defaults, **Then** all presets remain available.

---

### Edge Cases

- Storage is blocked, full or cleared (private mode, browser setting): the pages still work with the defaults, presets cannot be saved, and the host is told once that saving is not possible here; nothing is shown as saved when it was not.
- Remembered or preset data is damaged, comes from an older version or contains values that are no longer valid (for example a card count above the current maximum, a player count outside 2 to 8, an unknown skill or risk): invalid values fall back to the default for that value, valid ones are kept, and the page never fails to open.
- A preset or remembered setup contains more computers than the player count allows: only as many as fit are used.
- A preset name is empty, only spaces, or too long: it is rejected with a clear message and nothing is saved.
- The maximum number of presets is reached: saving a new one is refused with a clear message that tells the host to delete one first; replacing an existing one still works.
- Two browser tabs change presets at the same time: the last write wins and the list is correct after the next reload; neither tab breaks.
- Loading a preset in a lobby where the host is not the host (any non-host) or in a running game: not available.
- The game options are extended later by new features (R9, R20): presets and the remembered setup saved before that release still load, with defaults for the new options.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST remember, on the device only, the nickname last used to sign in and pre-fill it on the nickname page.
- **FR-002**: When the host starts a game, the system MUST remember its player count, game options (target score, minimum points, four-of-a-kind doubling, cards per type), computer seats (skill, risk, seat position) and computer speed as the "last setup" of this device.
- **FR-003**: The create-game page MUST pre-fill player count and game options from the last setup, and a newly created game MUST start with the remembered computer seats and computer speed, as far as the player count allows.
- **FR-004**: Without a remembered setup, every value MUST be the existing default; defaults MUST NOT change by this feature.
- **FR-005**: The game name and the game password MUST NOT be remembered or stored in presets.
- **FR-006**: The host MUST be able to save the current settings under a name as a preset, on the create-game page and in the game lobby.
- **FR-007**: A preset MUST contain player count, game options, computer seats (skill, risk, seat position) and computer speed.
- **FR-008**: The host MUST be able to open a "Load preset" list on the create-game page and in the game lobby and apply a preset to the current form or lobby in one action.
- **FR-009**: Applying a preset on the create-game page MUST replace all values of the form at once; applying it in the game lobby MUST apply the computer seats and computer speed only, because the player count and the game options of an existing room are fixed.
- **FR-010**: Applying computer seats in the lobby MUST only use free seats, MUST NOT change or remove seated humans or their order, and MUST tell the host when not all computers fit.
- **FR-011**: The host MUST be able to delete a preset; deleting MUST NOT affect other presets or the last setup.
- **FR-012**: Saving under an existing name MUST ask for confirmation and then replace that preset; names MUST be unique ignoring case and surrounding spaces.
- **FR-013**: A preset name MUST be 1 to 30 characters after trimming; the number of presets MUST be limited to 10 and the system MUST explain the limit when it is reached.
- **FR-014**: The create-game page MUST offer "Reset to defaults", which restores player count and game options to the defaults, clears the remembered computer seats and computer speed of the last setup, and keeps all presets.
- **FR-015**: Remembered data and presets MUST be stored on the device only, MUST NOT be sent to the server and MUST NOT be shared between devices or browsers.
- **FR-016**: Reading remembered data MUST tolerate missing, damaged, outdated or partly invalid data: each invalid value MUST fall back to its default, and no page may fail because of it.
- **FR-017**: When saving is not possible (storage blocked or full), all features MUST still work with defaults for the current page load, and the host MUST be told that settings cannot be saved on this device.
- **FR-018**: Loading, saving and deleting presets MUST be keyboard operable and have accessible names, in line with the rest of the lobby; the preset list MUST work on phones.
- **FR-019**: Only the host MUST see the preset controls in the game lobby; no preset control MUST appear in a running game.
- **FR-020**: All new user-visible texts MUST exist in English and German.
- **FR-021**: The user documentation and the roadmap MUST describe remembered settings and presets and mark R10 as delivered.

### Key Entities

- **Last setup**: The setup of the most recently started game on this device: player count, game options, computer seats with skill and risk, computer speed. One per device. Used to pre-fill the next new game.
- **Preset**: A named, saved setup with the same content as the last setup. Several per device, limited in number, unique by name.
- **Remembered nickname**: The nickname last used on this device.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A host who repeats the same setup reaches a ready-to-wait lobby (settings and computers as last time) from the nickname page without changing any setting, in at most 3 clicks.
- **SC-002**: A host applies a saved preset in at most 3 interactions (open the list, choose, confirm if asked) and all settings of the preset are applied in 100% of tested cases.
- **SC-003**: In 100% of tested cases, the game name and password never appear in remembered data or presets.
- **SC-004**: With blocked, empty or damaged storage, 100% of tested page loads still show a usable form with the defaults.
- **SC-005**: A host can return to the complete default setup with one action, without reloading the page.
- **SC-006**: First-time users and users without any remembered data see exactly the same defaults as before this feature.

## Assumptions

- "Lobby form" in the roadmap covers the nickname page, the create-game page and the computer controls in the game lobby, because that is where these values are entered today.
- Computer seats and the computer speed are set in the game lobby after the game exists; remembering them therefore means pre-filling a newly created game's lobby, and they are captured when a game is started, not on every change.
- The last setup is captured at game start, not on creation, so abandoned games do not overwrite a good setup.
- "Reset to defaults" is included because remembered values need a clear way back; it is offered on the create-game page only, where the full set of options is edited.
- Presets are limited to 10 and can be deleted but not renamed; a rename is covered by saving under a new name and deleting the old one. This keeps the interface small (Constitution VII).
- Everything is stored in the browser of the device, which fits the anonymous play model (Constitution V); no server change and no protocol change are needed.
- Settings of the host who joins someone else's game are not remembered; only a game the person hosted and started counts.
- Computer names are not part of remembered setups and presets; computers get new names as usual.
