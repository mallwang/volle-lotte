# Feature Specification: Remembered Settings and Presets

**Feature Branch**: `015-remembered-settings`

**Created**: 2026-10-19

**Status**: Draft

**Design**: [design.md](design.md)

**Input**: User description: "Implement roadmap item R10. The lobby form remembers the last nickname, player count, computer seats (skill, risk, speed) and game options on the device. The host can save the current game settings under a name as a preset, in the lobby or on the create-game page, and later load all of them at once with a 'Load preset' button. Details (storage, limits, rename and delete) are not yet specified; open question: whether a 'reset to defaults' button is needed."

## Scope

In scope: remembering the last used setup on the device and pre-filling the next new game with it; named presets that the host saves, loads and deletes, available on the create-game page and in the game lobby; a "Reset to defaults" action on the create-game page; a question when the host starts a game with a setup that is not saved yet, offering to save it as a preset; English and German texts, user documentation and roadmap update.

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

### User Story 4 - Offer to save a new setup when starting (Priority: P3)

A host who tweaked the setup for tonight presses "Start game". Because this setup is neither a preset they loaded nor the one they played last, a question appears: "Save this setup as a preset?". "Save as preset" opens the normal save dialog and the game starts afterwards. "No, start the game" starts the game right away, as without this feature. Hosts who replay their last setup or an unchanged preset are never asked.

**Why this priority**: Most hosts only discover presets when they are prompted at the moment they have a setup worth keeping.

**Independent Test**: Create a game with changed rules, press "Start game": the question appears. Choose "No, start the game": the game starts. Next game, load a preset and start without changes: no question. Change one computer, start: the question appears.

**Acceptance Scenarios**:

1. **Given** a setup that was not loaded from a preset and differs from the last setup, **When** the host presses "Start game", **Then** the question appears and the game has not started yet.
2. **Given** the question, **When** the host chooses "No, start the game", **Then** the game starts as usual.
3. **Given** the question, **When** the host chooses "Save as preset" and saves, **Then** the game starts; **When** they cancel the save dialog, **Then** they return to the question.
4. **Given** a preset was loaded and nothing changed since, **When** the host presses "Start game", **Then** the game starts without a question.
5. **Given** a preset was loaded and a computer, the speed, the seats or a rule was changed afterwards, **When** the host presses "Start game", **Then** the question appears.
6. **Given** the setup equals the last setup of this device, **When** the host presses "Start game", **Then** the game starts without a question.
7. **Given** the question, **When** the host chooses "Back to lobby", **Then** the question closes and the game does not start.

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
- **FR-006**: The host MUST be able to save the current settings under a name as a preset, on the create-game page and in the game lobby. There is one shared list of presets per device: a preset saved in one place MUST appear in the other, and saving in one place MUST NOT change any preset other than the one with the same name.
- **FR-007**: A preset MUST contain player count, game options, computer seats (skill, risk, seat position) and computer speed. A preset is a snapshot taken at the moment of saving; later edits of the form or lobby MUST NOT change it. Saving on the create-game page MUST store the form values together with the computer seats and speed that are currently pending for the new game (from the last setup or a loaded preset, as shown on the page). Saving in the game lobby MUST store the complete setup of that room, including its fixed player count and game options, so a lobby preset can be loaded on the create-game page in full.
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
- **FR-022**: When the host starts a game, the system MUST ask whether to save the current setup as a preset, with the choices "Save as preset", "No, start the game" and "Back to lobby", if the setup is not known to be saved (FR-023).
- **FR-023**: The question MUST NOT appear when the setup was loaded from a preset and nothing in it (player count, game options, computer seats, speed) changed since, or when the setup equals the last setup of this device. The system compares only with the one loaded preset and the last setup, never with the whole preset list.
- **FR-024**: A setup that was saved as a preset in this lobby (by the question or the "Save as preset" button) MUST count as known and MUST NOT trigger the question again while it is unchanged.
- **FR-025**: "No, start the game" MUST start the game exactly as without the question; "Save as preset" MUST open the normal save dialog and start the game after a successful save, and cancelling it MUST return to the question.
- **FR-026**: After "No, start the game", the same unchanged setup MUST NOT trigger the question again in this lobby, including after a rematch.
- **FR-027**: The question MUST be shown to the host only and MUST NOT appear when storage is unavailable (FR-017).

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
- The create-game page has no computer controls of its own; it only shows the pending computers and speed (from the last setup or a loaded preset) that the lobby will get. They can be changed in the lobby only, and "Reset to defaults" clears them.
- Presets and the last setup are separate: saving or loading a preset never changes the last setup, and the last setup is never listed as a preset.
- Presets are limited to 10 and can be deleted but not renamed; a rename is covered by saving under a new name and deleting the old one. This keeps the interface small (Constitution VII).
- Everything is stored in the browser of the device, which fits the anonymous play model (Constitution V); no server change and no protocol change are needed.
- The question is asked in the lobby when the game is started, because that is the only place where "Start game" exists. "Known" is tracked only for the current lobby: after a reload of the lobby page the reference to a loaded preset is gone, so one extra question may appear; this is accepted to keep the feature simple.
- Settings of the host who joins someone else's game are not remembered; only a game the person hosted and started counts.
- Computer names are not part of remembered setups and presets; computers get new names as usual.
