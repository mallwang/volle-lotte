# Research: Game-Over Modal

## Decision 1: The modal lives in the table component

**Decision**: `Game` shows `app-game-lobby` for the lobby phase and `app-table` for every other phase. `Table` renders a new `app-game-over` dialog next to the existing "a computer took over" dialog. The result page (`apps/frontend/src/app/result/`) is deleted.

**Rationale**: The requirement is "the final table in the background". The table already renders a finished game's seats, scores, title row and log; the existing `removed` dialog is the pattern for a non-closable PrimeNG modal (`closable=false`, `closeOnEscape=false`, `draggable=false`). Without `dismissableMask` the backdrop does not close it. PrimeNG appends the dialog to `body` by default, so the table's scaled stage (CSS `transform`) does not shrink or clip it.

**Alternatives considered**: A separate route or component that re-renders the table (duplicates the table); keeping the result page and adding the modal to it (the table would not be behind it).

## Decision 2: When the modal opens

**Decision**: Visible when the room phase is `finished`, the player has a seat, the dice are no longer rolling, no turn notice is shown and every log entry has been revealed (`revealed >= logEnd`).

**Rationale**: The table already holds back scores, cards and notices while a roll animates (`displayedScores`, `revealedLog`, `notice`). Opening the modal on the raw `phase` would reveal the winner before the last roll stops (FR-003). The final `gameOver` entry is processed by the same reveal loop, so "everything revealed" is the correct and existing signal. A player without a seat keeps the existing `removed` dialog and gets no game-over modal.

**Alternatives considered**: A fixed delay after the phase changes (fragile, depends on the speed setting and the dice animation preference).

## Decision 3: A player who leaves a finished game keeps their seat

**Decision**: In a finished room, `leave` and a lost connection turn the human seat into a computer-shaped seat that keeps the player's nickname as its name and sets `former`, instead of today's `open` seat. The room logs `left` and elects another host if needed; the room is closed by the existing `closeIfEmpty` when no human remains. A rejoin stays impossible (it needs a running game).

**Rationale**: The frontend maps engine players to seats with `playerSeats` (the occupied seats in order). Today a leaver's seat becomes `open`, which shifts every later player's index and would corrupt the table behind the modal of everyone who stays (it was harmless while the result page showed `players[]` directly). Re-using the existing computer seat shape (as `replaceByBot` does while running) keeps indices, names and scores stable without a new seat state, protocol field or view change. The departed seat shows as a computer in the background table; that is cosmetic and only for the remaining players.

**Alternatives considered**: A new `departed` seat state (protocol change and every consumer must learn it); keeping the human seat with `connected=false` (the room would never become empty, and the 15 minute cleanup would close a room under players who still look at the modal).

## Decision 4: Reload and reconnect release the player

**Decision**: In `session:start`, if the player's room is finished, the gateway calls the same leave path as `game:leave` (seat handover per decision 3, host election, lobby socket join) and returns no `game`. Connections that drop while the room is finished are released immediately (no grace period, no `disconnected` log entry); a later `session:start` finds no seat and takes the existing "not in a game" branch.

**Rationale**: FR-008: the finished game must not come back and a player must not be blocked from other games. No message shape changes, so `PROTOCOL_VERSION` stays. The client already handles `session:start` without a game (clears the game, no error unless it had one; in `replay` the existing "server restarted" warning applies only if the client still held a game, so the client also skips that warning when the held game was finished).

**Alternatives considered**: The client forgets the game itself (the server would still list the player as seated; a second tab would restore it).

## Decision 5: Leaving by navigation

**Decision**: `LeaveGame.situation` stays `none` for a finished game (no confirmation, no tab-close warning), but `leaveGameGuard` additionally calls `socket.leave()` when the game is finished.

**Rationale**: FR-006: back button or menu navigation must not strand the player in a finished room. The modal's button calls `socket.leave()` directly and the `Game` redirect navigates to the games list as before.

## Decision 6: Celebration built on party-js, as a shared service

**Decision**: `core/celebration.ts` exposes `start()` and `stop()`. `start()` returns without effect if the system asks for reduced motion (`matchMedia('(prefers-reduced-motion: reduce)')`), loads `party-js` with a dynamic import and launches a burst of confetti from three random points in the upper part of the viewport at once, then repeats every 3 s while the document is visible (the cadence of the ReAIity Guesser final confetti). `stop()` clears the interval. The bursts use the same variation options as the ReAIity Guesser (`count`, `spread`, `speed`, `size` ranges), with a larger count.

**Rationale**: The author's `launchConfetti` and `startFinalConfetti`/`clearFinalConfetti` (reaility-guesser `src/app.js`) are `party.confetti(target, {count, spread, speed, size})` plus a 3 s interval. party-js 2.2.0 is MIT, ships types and respects `prefers-reduced-motion` itself in its renderer; the service checks it too so no timers run at all. Its particle container has a fixed full-screen layer; it must not block clicks on the modal (verified in the browser, pointer events). The dynamic import keeps the library out of the initial bundle (budget 1 mb warning).

**Alternatives considered**: `canvas-confetti` (another dependency, not what the author uses); CDN script as in ReAIity Guesser (breaks the single-origin container); a hand-written canvas (more code to own).

## Decision 7: Winner

**Decision**: The player is the winner when `view.game.result.winner` (an engine index) maps through `playerSeats` to `view.you.seat`. Ranking entries are shown with the same index mapping. Ties on rank keep the existing ranking format; only the named winner celebrates.

**Rationale**: `Result.winner` and `Rank.players` are engine indices, not seat numbers (the old result page read `game.players[i].name`).
