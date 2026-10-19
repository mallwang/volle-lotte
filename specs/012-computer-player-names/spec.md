# Feature Specification: Computer Player Names

**Feature Branch**: `012-computer-player-names`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "The host should be able to name computer players so that they can be told apart in an active game. A predefined, random name (adjective + noun, like Docker container names) that the host can rename. Names are generated in the host's UI language (German or English), both in the lobby and when a computer takes over a seat after a player left a running game. If the host is the one who left, the language of the host who just left is used. Example: a German host leaves, the computer gets a German name; the new host is English; the English host leaves, the computer gets an English name; and so on."

## Scope

In scope: a name for every computer seat (random default, host can rename), random name generation in German and English, the language rule for names (current host, or the leaving host), showing the name everywhere a computer is shown today (lobby seats, table, log, results), keeping the name stable for the rest of the game, English and German user documentation.

Out of scope: names for human players (they keep choosing their own nickname), more languages than the two UI languages, a "roll a new name" button (the host can rename or reset the seat), changing computer skill, risk or speed (features 010 and 011), saving favourite names.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Computers get readable, random names in the lobby (Priority: P1)

The host sets a seat to "computer" in the lobby. Instead of an anonymous "Computer 3", the seat shows a friendly random two-word name in the host's UI language, for example "Brave Otter" (English) or "Mutiger Fuchs" (German). Several computers in one game get different names, so everybody can tell them apart at the table.

**Why this priority**: This is the core value: distinguishable computer players. Everything else builds on a name existing for every computer seat.

**Independent Test**: In the lobby, set three seats to computer with the UI set to German, then again with English. Every seat shows a different two-word name in the matching language; the names appear identically on all connected clients and later at the table.

**Acceptance Scenarios**:

1. **Given** a lobby with the host's UI set to English, **When** the host sets a seat to computer, **Then** the seat shows a random "adjective noun" name made of English words.
2. **Given** a lobby with the host's UI set to German, **When** the host sets a seat to computer, **Then** the seat shows a random "adjective noun" name made of German words, and the adjective agrees with the noun in grammatical gender (for example "Mutiger Fuchs", "Flinke Katze", "Kluges Reh").
3. **Given** a lobby with several computer seats, **When** the names are shown, **Then** no two seats (human or computer) have the same name.
4. **Given** a seat with a computer name, **When** the host sets the seat to open and to computer again, **Then** the seat gets a new random name.
5. **Given** a started game, **When** a player looks at the table, log and result screen, **Then** each computer appears under its name and never as "Computer N".

---

### User Story 2 - Host renames a computer (Priority: P1)

The host does not like a generated name, or wants a name that fits the group ("Oma", "Chef"). The host edits the name of a computer seat in the lobby, confirms it, and everyone sees the new name. The host can also rename a computer during a running game from the same place where other host settings live.

**Why this priority**: Naming by the host is the headline of the request; the random default only makes it effortless.

**Independent Test**: As host, rename a computer in the lobby, start the game and verify the new name at all clients; rename it again in the running game and verify the change on all clients.

**Acceptance Scenarios**:

1. **Given** a computer seat in the lobby, **When** the host enters a new valid name, **Then** all clients show the new name immediately.
2. **Given** a running game, **When** the host renames a computer, **Then** all clients show the new name from then on (seat, table, later log entries, results).
3. **Given** a non-host player, **When** they look at a computer seat, **Then** they cannot rename it.
4. **Given** the host enters a name that an existing player or computer already uses (ignoring upper/lower case), **When** they confirm, **Then** the change is rejected with a clear message and the old name stays.
5. **Given** the host enters an empty name or one that is too long, **When** they confirm, **Then** the change is rejected with a clear message and the old name stays; the name rules are the same as for player nicknames.
6. **Given** the host leaves the name unchanged or cancels, **When** the dialog closes, **Then** the name stays as it was.

---

### User Story 3 - A computer that takes over gets a name in the right language (Priority: P1)

During a running game a player leaves, times out too often or loses the connection, and a computer takes over the seat. The new computer gets a random name in the language of the host. If the leaving player is the host, the language of that leaving host is used (not the language of the host who is elected afterwards).

**Why this priority**: Without it, takeover computers would be anonymous or in the wrong language, and the table would show an unnamed seat exactly when confusion is most likely.

**Independent Test**: Play with a German host and English guests. Let a guest leave: the computer gets a German name. Let the German host leave (an English player becomes host): the computer gets a German name. Then let the new English host leave: the computer gets an English name.

**Acceptance Scenarios**:

1. **Given** a running game whose host uses German, **When** a non-host player leaves and a computer takes over the seat, **Then** the computer gets a German name.
2. **Given** a running game whose host uses English, **When** a non-host player leaves, **Then** the computer gets an English name.
3. **Given** a German host, **When** the host leaves and a computer takes over their seat, **Then** the computer gets a German name, even though an English-speaking player becomes the new host.
4. **Given** an English-speaking player became host after the previous scenario, **When** that host leaves, **Then** the computer taking over gets an English name.
5. **Given** a computer that took over, **When** the former player rejoins and takes the seat back, **Then** they get their own nickname back and the computer name is dropped.
6. **Given** a computer that took over, **When** the host changes their UI language afterwards, **Then** the computer keeps its name; only later takeovers use the new language.

---

### User Story 4 - Texts and documentation in both languages (Priority: P3)

The rename control, its messages and the how-to/user guide mention the feature in English and German, like every other feature.

**Why this priority**: Required for consistency with the rest of the app, but not needed to demonstrate the feature.

**Independent Test**: Switch the UI between English and German and check that every new label and message is translated; read the user guide for the naming section.

**Acceptance Scenarios**:

1. **Given** either UI language, **When** the host uses the rename control and triggers each error, **Then** all texts are in that language.
2. **Given** the user guides, **When** read in either language, **Then** they explain computer names, renaming and the language rule.

---

### Edge Cases

- Two players leave at nearly the same time: both computers get distinct names.
- The host's language is not known (older or incomplete client information): English is used.
- A generated name collides with a human nickname (for example a player is called "Brave Otter"): another name is picked, so duplicates never exist.
- A human joins with a nickname that equals a computer's name: the existing "nickname taken" rule applies and the player picks another name.
- A seat set back to "open" or "locked" loses its name; a later computer on that seat gets a new one.
- The host renames a computer to something like "Computer 3": allowed as long as it is valid and unique.
- Names may contain umlauts and other letters; they must display correctly everywhere and must not break the layout of a seat column (long names are shortened visually, the full name is available as tooltip or in the settings).
- A client with an older protocol version connects: the existing protocol version check applies, no partial feature support.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Every computer seat MUST have a display name; the anonymous "Computer N" label MUST no longer be shown anywhere.
- **FR-002**: When a seat becomes a computer (set by the host in the lobby, or taken over from a player), the system MUST assign a random name made of one adjective and one noun, separated by a space.
- **FR-003**: The name MUST be generated from curated word lists in the language that applies for that moment (see FR-005 and FR-006); supported languages are English and German.
- **FR-004**: German names MUST be grammatically correct: the adjective ending matches the noun's gender. Every generated name MUST consist of real words of the requested language (no English words in German names).
- **FR-005**: For a computer set by the host in the lobby, or by a takeover after a non-host player left, the language MUST be the UI language of the current host at that moment.
- **FR-006**: For a takeover after the host left, the language MUST be the UI language of the host who left, not that of the newly elected host.
- **FR-007**: A computer's name MUST stay the same for the rest of the game unless the host renames it. Changing the host or the host's UI language MUST NOT rename existing computers.
- **FR-008**: The host MUST be able to rename any computer seat in the lobby and in a running game; other players MUST NOT be able to.
- **FR-009**: A name entered by the host MUST follow the same rules as player nicknames (not empty after trimming, same maximum length, same allowed characters) and MUST be unique among all players and computers in the game, ignoring upper/lower case. Invalid input MUST be rejected with a clear message and leave the old name untouched.
- **FR-010**: Generated names MUST be unique among all players and computers in the game; on a collision the system MUST pick another name.
- **FR-011**: A human joining MUST NOT be able to take a name that a computer in the game uses.
- **FR-012**: All clients MUST see the same computer names at all times, including after a reconnect: in the lobby seats, the table, the game log and notifications, and the results.
- **FR-013**: When a former player takes their seat back from a computer, the seat MUST show the player's own nickname again and the computer name MUST be released.
- **FR-014**: The UI language of each player MUST be known to the game so the host's language can be used; if it is unknown, English MUST be used.
- **FR-015**: Every new text (labels, buttons, messages, documentation) MUST exist in English and German.
- **FR-016**: Existing behaviour MUST stay unchanged: computer skill, risk and speed, takeover and rejoin rules, timers, scoring and game rules.

### Key Entities

- **Computer name**: The display name of one computer seat. Belongs to a seat in one game; unique within the game together with all player nicknames.
- **Name word lists**: Curated adjectives and nouns per language (English, German); German nouns carry their grammatical gender so adjectives can agree.
- **Naming language**: The language used for a naming event; the host's UI language, or the leaving host's UI language when the host leaves.
- **Seat (existing)**: Gains a name when it is a computer; human seats keep their nickname.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a game with seven computers, 100% of the names are pairwise different and none is shown as "Computer N".
- **SC-002**: In 1,000 generated German names and 1,000 generated English names, 100% are made of words of the requested language, and 100% of the German names have an adjective that agrees with the noun's gender (checked against the word lists).
- **SC-003**: In the host-leaves scenario with alternating German and English hosts, 100% of takeover computers get a name in the language of the host who left.
- **SC-004**: A host can rename a computer in under 10 seconds, and all other players see the new name within 1 second.
- **SC-005**: A player can tell every computer apart at the table in a 2–8 player game without counting seat positions (verified by hand in a test game with four computers).
- **SC-006**: No existing game, lobby or computer behaviour regresses (existing automated tests pass unchanged except where they expected "Computer N").

## Assumptions

- Naming is a host-only setting, like skill, risk and speed; the host can rename in the lobby and in a running game.
- The generated name is stored with the game, so it survives reconnects and is the same for everybody; it is not regenerated per client.
- The word lists are small, curated and family-friendly (everyday adjectives and animals, in the spirit of the Docker name generator), with several thousand combinations per language, enough for eight seats without noticeable collisions.
- The third-party package `unique-names-generator` (checked, v4.7.1) does **not** fit: its word lists are English only (adjectives, animals, colors, countries, languages, names, numbers, Star Wars); it has no German dictionaries (the only "German" hits are the words "German"/"Germany" in its country and language lists), and it cannot handle German gender agreement. Therefore the generator is built in a new own workspace library (the logic is a random pick from two lists), with English and German word lists, usable by frontend and backend.
- The host's UI language is communicated by each client to the game together with the existing player information; clients that do not send it are treated as English.
- Docker's name generator (adjective + scientist surname) is the model for the look and feel only; this feature uses adjective + animal noun instead.
- Only two UI languages exist (English, German); adding a language later means adding one more word list.
- Nicknames and computer names share one name space inside a game, so the same uniqueness check applies to both.
