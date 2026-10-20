# Research: Sounds

All decisions are frontend-only; no unknowns were left open in the Technical Context.

## R1. Audio playback

- **Decision**: One `HTMLAudioElement` per cue, created and loaded once (`preload = 'auto'`, `load()`), replayed by `currentTime = 0` and `play()`. A rejected `play()` promise is swallowed.
- **Rationale**: The victory sound (spec 013) already works this way and its tests mock `Audio`. One element per cue gives FR-012 for free: replaying the same cue restarts it, a different cue has its own element and keeps playing. Blocked autoplay and a failed file both surface as a rejected promise (FR-011).
- **Alternatives considered**: Web Audio API (`AudioContext` with decoded buffers): lower latency and true overlap, but more code, an unlock step and harder tests, with no requirement that needs it. A sound library (howler.js): a new dependency without a concrete need (Principle VII).

## R2. Where the sound logic lives

- **Decision**: A new root service `Sounds` in `apps/frontend/src/app/core/sounds.ts` owns the cue table, the audio elements, the mute setting and `play`/`stop`. `Celebration` stops creating its own `Audio` and plays the `victory` cue through `Sounds`. The triggers stay where the state is already derived: the table (your turn, countdown, Volle Lotte) and the game page (game start).
- **Rationale**: One place for files and mute makes FR-007, FR-009 and FR-014 hold for every cue, including the existing one. The table already knows when the roll animation and notices are over; duplicating that in a service would be fragile.
- **Alternatives considered**: Extending `Celebration` with the new cues: it is a confetti effect, and the cues have nothing to do with celebrations. A service that watches `SocketService.game()` for every trigger: it would have to re-implement the table's roll and notice timing (FR-006, acceptance 1.4).

## R3. Detecting "your turn"

- **Decision**: A change of my seat from "not current" to "current" (`onTurn`, `mine()` without the notice check) arms the cue; it plays once `mine()` is true (no notice shown) and no dice roll, so after the previous turn's last roll and notice. The first value after the table opens is only a baseline. The effect is declared after the log-processing effect, which sets the roll and notice for the same state update.
- **Rationale**: The sound comes with the visible turn change (acceptance 1.4); the armed flag keeps my own later rolls from replaying it. The baseline covers the first turn after the start (FR-002, the table is created at the start) and a reload or reconnect (acceptance 1.5). Spectators and replaced players never have `mine()` true (FR-013).
- **Alternatives considered**: Watching `game.current` in the raw state: it changes before the notice and the last roll are shown, so the sound would spoil the result. A `turnEnded` log entry: the same timing problem and an extra case for the first turn.

## R4. Countdown beeps

- **Decision**: While `mine()` is true and the table's `deadlineAt()` is set, schedule one `setTimeout` per beep at `at - 5000, at - 4000, ..., at - 1000` that is still in the future; cancel all of them whenever `mine()`, `deadlineAt()` or the table changes or is destroyed. A pure helper `countdownDelays(at, now)` computes the delays.
- **Rationale**: `deadlineAt()` is already `null` while dice roll, while a notice shows and while the game is paused (spec 018 drops the deadline on pause), and it changes with every new step, so re-arming on change covers FR-003 and FR-004. Five beeps for a full timer, fewer for a shorter remainder (acceptance 3.5). The pure helper is easy to test.
- **Alternatives considered**: Reusing the table's one-second `now` tick: it is not aligned to the deadline, so beeps would drift up to a second. An interval started at "5 s left": same alignment problem after a reconnect.
- **Note**: Browsers throttle timers in background tabs to about once per second; a beep may come late there, which is acceptable for a cue that repeats every second.

**Change (user feedback):** the window was first the last 10 seconds. Draw and throw steps last only 10 s (`TURN_LIMIT_MS`), so the beeps started with the turn and met the "your turn" and start sounds; it is now the last 5 seconds.

## R5. Detecting the game start

- **Decision**: The game page (`game/game.ts`), which switches from `app-game-lobby` to `app-table`, keeps the previous phase it saw; a change from `lobby` to `running` plays `game-start`.
- **Rationale**: It is the one place that sees both phases in the same page view. A reload or reconnect into a running game sees `running` first and plays nothing (acceptance 4.3). A rematch goes `finished` to `lobby` to `running` and plays it again (acceptance 4.1). Spectators only watch running games, so they never see the change (FR-005).
- **Alternatives considered**: The `started` log entry in the table: the table is created after it arrived and skips old entries, and on a reload it cannot tell an old start from a new one.

## R6. Volle Lotte applause

- **Decision**: In the table's `process()` (which handles each revealed log entry after its roll animation), a `turn` entry with `data.type === 'volleLotte'` and `seat === you.seat` plays `volle-lotte`.
- **Rationale**: `process()` runs the entry only once the roll is over, and immediately when the dice animation is skipped (FR-006). Old entries are never processed after a reload. A Clover win's second Volle Lotte is processed before the game-over modal opens, so applause comes first and the victory sound follows on its own element (acceptance 4.6).
- **Alternatives considered**: Comparing the `volleLottes` count: it counts every player's Volle Lotte and would need an extra seat filter.

## R6a. Points sound

- **Decision**: In `process()`, a `turn` entry with `data.type === 'banked'` and `seat === you.seat` plays `points`, unless the game is over (`g.game?.result` set, the same condition under which no result notice is shown). It runs before the notice is set, next to the Volle Lotte applause, and plays at the same time as it when both apply.
- **Rationale**: The server emits `banked` exactly when `credit > 0` (`turn.ts`), including the automatic credit at the end of Star and Double Lotte turns, so it is the one event for "points reach the score". It is processed after the roll animation, so it matches the visible result. The `your-turn` cue follows only after the notice (2.5 to 8 s later) and never meets it; at the winning bank the victory sound alone plays. Plus/Minus has no `banked` entry and plays no points sound.
- **Alternatives considered**: Reacting to a rising own score: also fires for the Plus/Minus effect and for every rejoin, and needs the roll animation timing again.

## R6b. Defeat sound

- **Decision**: In the table, next to the `celebrate` computed, a computed `lost` is true while `gameOverVisible()` holds, the seat is a player's (`you.seat >= 0`), the viewer is no spectator and `!youWon(g)`. An effect plays `defeat` when it turns true and stops it when it turns false or the table is destroyed.
- **Rationale**: `gameOverVisible` already waits for the last roll, notice and log and ignores later log entries, so the sound plays once with the modal, exactly like the victory sound (acceptance 7.1, 7.4). Spectators and taken-over seats are excluded explicitly (FR-013).
- **Alternatives considered**: Putting it in `Celebration`: it is about confetti and the winner; the defeat sound has no visual part.

## R7. Mute setting

- **Decision**: `Sounds.muted` is a signal read from `localStorage` key `vl-muted` (`'true'` = muted), default `false`, written on toggle; storage errors are caught as in `DicePrefs` and `ThemeService`. Muting pauses and rewinds every cue; `play` does nothing while muted.
- **Rationale**: Same pattern as the other device-local preferences; FR-009, FR-010.
- **Alternatives considered**: Listening to the `storage` event for other tabs: not required (the spec accepts "next page load").

## R8. Menubar button

- **Decision**: A second round text `p-button` in the menubar end group, between the language select and the theme button, icon `pi pi-volume-up` or `pi pi-volume-off`, `aria-pressed` true while muted, `ariaLabel` "state. action" and `pTooltip` "action", as in [design.md](design.md).
- **Rationale**: Mirrors the theme button (spec 009) so the bar stays consistent; approved in the UX review.

## R9. Sound files

- **Decision**: `apps/frontend/public/sounds/{game-start,your-turn,countdown,volle-lotte,points}.mp3`, each a byte copy of `victory.mp3` for now; paths are constants in `sounds.ts`.
- **Rationale**: FR-014: one fixed path per cue; dropping in a new file needs no code change. Files in `public/` are copied as-is by the build.
- **Note**: The placeholders are 313 KB each (about 1.25 MB extra in the image); they are fetched only when a table opens. The final files must stay at most 100 KB each (FR-015).
