# Feature Specification: Sounds

**Feature Branch**: `019-sounds`

**Created**: 2026-10-20

**Status**: Draft

**Design**: [design.md](design.md) (approved mockup of the sound button and the cue moments)

**Input**: User description: "R11 Sounds (see docs/roadmap.md, item R11). Optional sound effects at the table, building on the existing victory sound and Celebration service from spec 013. New sounds: a game start sound; a beep every second during the last 10 seconds of the own turn timer; a distinct sound (for example a double bell) when it becomes your turn after the previous player busted or finished; applause on your own Volle Lotte. One mute toggle in the menubar, remembered in localStorage; no autoplay before the first user interaction (blocked autoplay tolerated as in spec 013); assets stay small. Until the final audio files are provided by the user, every sound uses the existing victory.mp3 as a placeholder; each sound must be a separate, replaceable asset path so the real files can be dropped in later without code changes. Vibration on mobile is out of scope (R3)."

## Scope

In scope: four new sound cues at the table (game start, turn timer countdown, your turn, own Volle Lotte), one mute toggle in the menubar that silences every sound of the app including the existing victory sound, the mute choice remembered on the device, one separate sound file per cue (all of them a copy of the victory sound until the real files arrive), English and German texts, user documentation and roadmap update.

Out of scope: vibration and haptics (R3), a volume slider or per-cue switches, sounds for other players' actions, sounds in the lobby or the games list, sounds for spectators, sound choices per player or bought sounds (R23), score change animations (R19), changes to the game rules, timers, protocol or computer behaviour.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Hear when it is my turn (Priority: P1)

A player waits while the others play, maybe in another browser tab. When the turn passes to them (because the previous player busted, banked or ended their turn in any other way), a short, distinct sound plays, so they notice without watching the table.

**Why this priority**: This is the sound with the most practical value: in games with several players and computers, players miss their turn and run into the turn timer.

**Independent Test**: Play a game with one human and one computer. Each time the computer's turn ends, the "your turn" sound plays once on the human's device; it does not play when the human's own turn ends or when the turn moves between computers.

**Acceptance Scenarios**:

1. **Given** a running game where another player has the turn, **When** the turn passes to me, **Then** the "your turn" sound plays once.
2. **Given** a running game, **When** the turn passes from one other player to another, **Then** no sound plays on my device.
3. **Given** the browser tab is in the background, **When** the turn passes to me, **Then** the sound still plays.
4. **Given** the turn passes to me after the previous player's last roll, **When** the dice are still rolling or the turn result notice is still shown, **Then** the sound plays after the roll animation has finished, together with the visible change of the turn.
5. **Given** I reload the page or reconnect while it is my turn, **When** the table appears again, **Then** the sound does not play again for the same turn.

---

### User Story 2 - Turn the sounds off (Priority: P1)

A player who does not want sounds (in an office, at night, or simply by taste) switches them off with one button in the menubar. The choice is kept on this device for later visits, and it silences every sound of the app, including the existing victory sound.

**Why this priority**: Sound without a way to switch it off is a nuisance; the toggle must ship together with the first sound.

**Independent Test**: Press the sound button in the menubar, play a game to the end and win: no sound plays. Reload the page: the button still shows "muted". Press it again: sounds play again.

**Acceptance Scenarios**:

1. **Given** sounds are on, **When** I press the sound button in the menubar, **Then** sounds are off, the button shows a muted icon, and no sound of the app plays from now on.
2. **Given** a sound is playing, **When** I mute, **Then** it stops at once.
3. **Given** I muted the sounds, **When** I reload the page or come back later on the same device and browser, **Then** sounds are still off.
4. **Given** I have never used the button, **When** I open the app, **Then** sounds are on.
5. **Given** the device cannot remember settings (for example a private window with storage blocked), **When** I use the button, **Then** it works for the current visit and sounds are on again on the next visit.
6. **Given** any screen of the app, **When** I look at the menubar, **Then** the sound button is there next to the theme button, reachable by keyboard, with a label and tooltip that say what pressing it does.

---

### User Story 3 - Countdown beeps at the end of my timer (Priority: P2)

When the turn timer of a game is running out on the player's own action, a short beep plays every second during the last 10 seconds, so they know the automatic move is about to happen.

**Why this priority**: Helpful, but only in games with turn timers, and the timer bar already shows the remaining time.

**Independent Test**: Create a game with a turn timer, start the turn and do nothing: from 10 seconds before the deadline, one beep per second plays (10 beeps), then the automatic move happens. Act during the countdown: the beeps stop at once.

**Acceptance Scenarios**:

1. **Given** my turn timer is running, **When** 10 seconds or less remain, **Then** one beep plays per remaining full second, ending at the deadline.
2. **Given** the countdown beeps are playing, **When** I act (throw, select dice, bank, draw), **Then** the beeps stop; a new timer for my next step starts its own countdown from its own last 10 seconds.
3. **Given** another player's timer is running, **When** it runs out, **Then** no beeps play on my device.
4. **Given** the game is paused, **When** the timer is stopped, **Then** no beeps play; they continue only when the timer runs again.
5. **Given** a timer step that is shorter than 10 seconds, **When** it starts, **Then** beeps play only for the seconds that are left.
6. **Given** a game without turn timers, **When** I play, **Then** no beeps ever play.

---

### User Story 4 - Game start and Volle Lotte sounds (Priority: P3)

When a game starts, every seated human hears a short start sound. When the player throws a Volle Lotte themselves, applause plays.

**Why this priority**: Pure delight on top of the useful cues.

**Independent Test**: Start a game with two humans: both hear the start sound once. Throw a Volle Lotte: the applause plays on the thrower's device after the roll animation, not on the other player's device.

**Acceptance Scenarios**:

1. **Given** a game lobby, **When** the host starts the game (also a rematch), **Then** every seated human hears the start sound once.
2. **Given** I am the starting player, **When** the game starts, **Then** I hear the start sound and not also the "your turn" sound for the first turn.
3. **Given** I reload the page or reconnect into a running game, **When** the table appears, **Then** the start sound does not play.
4. **Given** it is my turn, **When** my throw is a Volle Lotte (also the second one of a Clover win), **Then** the applause plays once after the roll animation, together with the visible result.
5. **Given** another player throws a Volle Lotte, **When** the result is shown, **Then** no applause plays on my device.
6. **Given** a Clover win with my second Volle Lotte, **When** the game ends, **Then** the applause plays first and the victory sound follows with the game-over modal, without both cutting each other off.

---

### User Story 5 - Replaceable sound files, texts and documentation (Priority: P3)

Each sound cue has its own file in the app, so the maintainer can replace the placeholder with the real sound by dropping in a file with the same name. All new texts exist in English and German, the user guide describes the sounds and the mute button, and the roadmap marks R11 as done.

**Why this priority**: Needed to finish the item, not to demonstrate it.

**Independent Test**: Replace one of the sound files with another short audio file of the same name and format, rebuild, and hear the new sound for that cue only. Switch the language and check the sound button's label and tooltip.

**Acceptance Scenarios**:

1. **Given** the shipped app, **When** I look at the sound files, **Then** there is exactly one file per cue (victory, game start, countdown beep, your turn, Volle Lotte), and the new ones are copies of the victory sound.
2. **Given** a cue's file is replaced by another file with the same name and format, **When** the app is rebuilt, **Then** only that cue sounds different, without any other change.
3. **Given** the UI language is German, **When** I hover or focus the sound button, **Then** its label and tooltip are German; the same applies to English.

---

### Edge Cases

- The browser blocks sound before the first click or key press on the page (for example after a reload straight into a running game): the sound is skipped silently, nothing breaks, and later sounds play once the player has interacted with the page.
- The same cue is triggered again while it is still playing (countdown beeps with a long placeholder file): the cue restarts from the beginning instead of playing twice on top of itself.
- Different cues meet (your turn and countdown, Volle Lotte and victory): each plays; a new cue does not stop a different cue that is still playing.
- A player was replaced by a computer and has not returned: their device plays no game sounds for that seat until they rejoin.
- A spectator watches a game: no game sounds play for the spectator.
- The tab is in the background: sounds still play (that is the point of the "your turn" cue); the browser decides whether background audio is allowed.
- The "skip dice animation" setting is on: sounds that wait for the roll animation play as soon as the result is shown.
- Reduced motion is requested by the system: it does not affect sounds (as for the victory sound in spec 013).
- A sound file fails to load (network error): that cue stays silent, the game and other cues are not affected.
- The connection drops during the countdown: no beeps are invented while offline; after reconnecting, the countdown follows the timer the server reports.
- Mute is pressed in another tab of the same browser: the other tab picks up the choice at the latest on its next page load.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When the turn passes to the player's own seat during a running game, the app MUST play the "your turn" sound once on that player's device, regardless of how the previous turn ended.
- **FR-002**: The "your turn" sound MUST NOT play for turn changes between other players, for the first turn right after the game start (the start sound covers it), or again after a reload or reconnect for the same turn.
- **FR-003**: When the player's own turn timer has 10 seconds or less left, the app MUST play one short beep per remaining full second until the deadline; the countdown MUST stop as soon as the timer is replaced, stopped or paused, and MUST follow the remaining time of a new timer.
- **FR-004**: No countdown beeps MUST play for other players' timers, in games without turn timers, or while the game is paused.
- **FR-005**: When a game starts (including a rematch), the app MUST play the start sound once for every seated human; it MUST NOT play on reload, reconnect or when watching.
- **FR-006**: When the player's own throw is a Volle Lotte, the app MUST play the applause once, after the roll animation (or at once when the dice animation is skipped); it MUST NOT play for other players' throws.
- **FR-007**: The existing victory sound MUST keep its current behaviour (spec 013) and MUST follow the mute setting like every other sound.
- **FR-008**: The menubar MUST offer one sound button on every screen, next to the theme button, that switches all sounds of the app on and off; its icon MUST show the current state, and its label and tooltip MUST say what pressing it does.
- **FR-009**: Muting MUST stop any sound that is playing at that moment and silence all later sounds until sounds are switched on again.
- **FR-010**: The mute choice MUST be remembered on the device and browser; without a remembered choice, sounds MUST be on. If the device cannot remember it, the toggle MUST still work for the current visit.
- **FR-011**: A sound the browser refuses to play (no user interaction yet, failed file) MUST be skipped silently without an error message and without affecting the game.
- **FR-012**: Repeating the same cue while it plays MUST restart it rather than overlap it; different cues MUST NOT cut each other off.
- **FR-013**: Spectators and players whose seat is held by a computer MUST NOT hear game sounds for that game.
- **FR-014**: Each cue MUST have its own sound file with a fixed name; until the real files are delivered, each new file MUST be a copy of the existing victory sound. Replacing a file MUST change only that cue and need no other change.
- **FR-015**: Sound files MUST be fetched ahead of time when the table opens, so a cue is not delayed by the network, and each new final file MUST stay small (at most 100 KB; the existing 313 KB victory sound and the placeholder copies of it are exempt).
- **FR-016**: Every new text (sound button label and tooltip, user guide section) MUST exist in English and German; the roadmap MUST mark R11 as done with a one-line result when the feature ships.
- **FR-017**: Existing behaviour MUST stay unchanged: game rules, timers, the game protocol, computer behaviour, the celebration confetti, the theme button and the table layout.

### Key Entities

- **Sound cue**: One kind of sound event (victory, game start, countdown beep, your turn, Volle Lotte) with its own file and its own trigger rule; played only on the device of the player it concerns.
- **Sound setting**: The device-local on/off choice for all sounds; on by default.
- **Turn timer (existing)**: The server deadline of the current step; the countdown cue follows the deadline of the player's own seat.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a game with 2-8 players, the "your turn" sound plays on the player's device in 100% of the turn changes to their seat and in 0% of other turn changes.
- **SC-002**: When a player lets their timer run out, they hear exactly as many beeps as full seconds were left of the last 10 (10 for a normal timer), and 0 beeps after they act.
- **SC-003**: With sounds muted, 0 sounds play during a full game, including a win; the muted state survives 100% of reloads on the same device (where the browser allows storage).
- **SC-004**: Each cue plays within 0.3 seconds of its visible trigger (turn change, final roll, game start) on a normal connection once the table has loaded.
- **SC-005**: Replacing one sound file changes the sound of exactly one cue, verified for each of the five cues.
- **SC-006**: The sound button is reachable and operable by keyboard alone, with a visible focus and a text label in both languages.
- **SC-007**: No existing game, lobby or table behaviour regresses; existing automated tests pass unchanged.

## Assumptions

- "When it becomes your turn after the previous player busted or finished" covers every turn change to the player's own seat: in this game a turn always ends by a bust, by banking, by a card that ends the turn, by a timer expiry or by the player leaving, so no case needs a different sound.
- The "your turn" sound is one cue; a separate sound for "after a bust" versus "after a bank" is not wanted.
- The countdown counts in whole seconds from the deadline the server reports; it is a presentation of the existing timer and changes nothing on the server.
- Sounds are on by default, as the victory sound already plays by default today.
- The sounds are client-side presentation only and need no protocol change: the client already knows the turn, the deadline, the throw result and the game start from the messages it receives.
- The placeholder (victory sound) is longer than a beep; until the real files arrive, the countdown restarts the placeholder every second, which is acceptable for testing. The user provides the final files later.
- Phones are covered by the same behaviour in the mobile browser; vibration and haptics follow with R3.
