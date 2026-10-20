# Roadmap

Living list of what is done, what is next and what is only an idea. New ideas go here first; a spec is created when an item is picked up. Every spec is compared against this file, and agents read it to know what is still open.

Last updated: 2026-10-19. The Java -> web migration is finished (see [migration.md](migration.md)); everything below is extension work.

## How to use

- Status: `idea` (noted, not discussed), `planned` (scope agreed, no spec yet), `in progress` (spec exists), `done`.
- Pick an item, run `/speckit-specify`, put the spec number in the item, and set the status. When the feature ships, move it to [Done](#done) with a one-line result.
- Keep items short: goal, why, constraints, open questions. Details belong in the spec.

## Done

| Spec | Feature                                                                                                                                                                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001  | Rules engine (`libs/game-rules`), port of the Java game with all card types and 2-8 players                                                                                                                                                                                                                         |
| 002  | Lobby and multiplayer (NestJS gateway, Socket.IO, computer players with difficulties, reconnect)                                                                                                                                                                                                                    |
| 003  | UI foundation (PrimeNG, Terracotta theme, light/dark)                                                                                                                                                                                                                                                               |
| 004  | English and German UI and documentation                                                                                                                                                                                                                                                                             |
| 005  | Pip dice faces, per-die rolling animation, computer pacing                                                                                                                                                                                                                                                          |
| 006  | Open lobbies, rejoin after replacement by a computer, per-phase turn timers, host removal and bans                                                                                                                                                                                                                  |
| 007  | Active game table UI (seat columns, piles, dice area, log); desktop layout is the target, see below                                                                                                                                                                                                                 |
| 008  | Desktop minimum size: header and table scale as one 992x900 stage (minimum 695x630, scale 0.7), scaling notice and "window too small" hint, global focus ring, tab order and contrast checked                                                                                                                       |
| 009  | App shell: PrimeNG menubar on every screen (active page, "Current game" status), one shared leave confirmation (navbar, browser back, table and lobby buttons), light/dark-only theme with a sun/moon button; create-game form restyle (P3) dropped, it stays as is until the form is reworked                      |
| 010  | Computer speed setting: host slider 1-5 (default 3, faster than before) in lobby and table settings, one shared pacing table, toast on setting changes, protocol v5                                                                                                                                                 |
| 011  | Computer AI rework: decisions by expected value from exact dice odds, skill (easy, medium, hard, random) and independent risk (none, medium, high, random) per computer seat, random resolved per decision, score situation shifts risk, protocol v6                                                                |
| 012  | Computer player names: random "adjective noun" names in English or German (own Nx library), host can rename inline or roll a new name, language follows the host                                                                                                                                                    |
| 013  | Game-over modal over the finished table (no result page), finished games are not restored on reload, winner confetti (`party-js`, shared `Celebration` service, reduced motion respected) and a victory sound played once (preloaded at the table, blocked autoplay tolerated)                                      |
| 014  | Rematch in the same room: the host reopens the finished room as a lobby (same settings, computers and seat order), other players rejoin their reserved seat from the game-over modal, a start drops missing players, rounds reject stale requests, protocol v10                                                     |
| 015  | Remembered settings and presets: the last started setup (seats, rules, computers, speed) prefills the next game, up to 10 named presets (save, load, apply in the lobby, delete) on the create-game and lobby pages, "Reset to defaults", a save question on Start for new setups; device-local, no protocol change |
| 016  | Spectators: anonymous read-only viewers of running games ("Watch" in the games list, same password rule), spectator counter, no log entry or toast on join and leave, host switch "Allow spectators", spectators never affect timers or game end, reload resumes watching, protocol v11                             |
| N/A  | Connection state as toasts (lost, restored, failed with reload); the page is locked while offline                                                                                                                                                                                                                   |
| N/A  | Host handover: a player rejoining a game with only computers becomes host; the last host can end such a game from the games list (protocol v9)                                                                                                                                                                      |
| N/A  | Playtest fix: one-card discard piles have no background card                                                                                                                                                                                                                                                        |
| N/A  | Playtest fix: easy computers take all scoring dice                                                                                                                                                                                                                                                                  |
| N/A  | Host option to share a next-throw bust probability preview (off by default, protocol v7)                                                                                                                                                                                                                            |
| N/A  | Playtest fix: Star score updates wait for the final roll animation                                                                                                                                                                                                                                                  |
| N/A  | Playtest fix: Double Lotte always requires a Volle Lotte                                                                                                                                                                                                                                                            |
| N/A  | Docker image and Portainer stack, release workflow, app icon, page titles, version in the header                                                                                                                                                                                                                    |
| N/A  | Backend integration tests as manual e2e (`npm run test:e2e`, skill `run-e2e`), kept out of CI                                                                                                                                                                                                                       |

## Next

### R2. E2E suite with bots (`planned`)

Goal: a thorough suite that plays real games with bots of different strength and checks the functionality and the UI. Run manually through its own skill, never in CI.

- Starting point: `apps/backend/src/app/lobby/*.e2e.spec.ts` (socket level, no browser) and the `run-e2e` skill.
- Add Playwright for the UI (not installed in this repo yet; the `verify-ui` skill still says "throw-away scripts only", update it with this item). Stable selectors need `data-testid` attributes; there are none today.
- Spike: try [Lightpanda](https://github.com/lightpanda-io/browser) as an optional second Playwright project (`connectOverCDP`) for the flow checks (socket and DOM state, two player contexts). It has no layout or rendering engine, so it cannot replace Chromium for layout and focus checks.
- Ideas: bots of all difficulties against each other, many seeded games, UI checks per player count and language, reconnect and timeout flows in the browser, protocol version mismatch.

### R3. Mobile app as installable PWA (`idea`)

Goal: a separate mobile frontend with a UI optimized for phones, so the desktop and tablet frontend stays as it is. A new Nx application that only talks to the backend over WebSocket.

- Decision: no native store app for now (no Google Play or Apple publishing). Mobile users open the URL in their mobile browser and get the mobile UI; they can "install" it on the home screen. Capacitor is therefore not required for this step; it can be added later if a store presence is wanted (sideloaded APK is free, Google Play about 25 USD once, Apple Developer about 99 USD per year).
- Routing on the one public URL (`https://volle-lotte.allwang.family`), the question is what a phone browser sees:
  - A: client-side detection in the desktop app (`matchMedia('(pointer: coarse)')` and width) that shows "open the mobile version / continue anyway" (simple and robust);
  - B: routing in the reverse proxy (nginx) or in NestJS based on the user agent, so phones are served the mobile build directly (brittle, must not interfere with the no-cache rule for `index.html`);
  - C: serve the mobile build under `/m/` and link to it.
- Installable PWA: web app manifest and icons; Angular service worker for updates. An update is only activated in the lobby or after the game, never mid-game. The backend reports a `protocolVersion` (exists, see `PROTOCOL_VERSION`); show "update required" when it does not match. Do not cache `index.html` and `ngsw.json`, cache hashed assets for long. A plain PWA for the desktop frontend is not needed (the desktop and tablet layout exists, spec 008); the former item "PWA and safe updates" is merged here.
- Shared code: `libs/game-rules` (protocol types, rules); keep `scope:*` tags in mind for the new app.
- Open: the same bundle behind nginx or a second deployment; haptics and sound see R11. The desktop scope is settled (spec 008), so this item can start any time.

### R4. Save and load games (`planned`)

- Host saves a game server-side and loads it later; the game state is already immutable JSON (`toJSON`/`fromJSON`).
- Persist after every turn in SQLite so restarts do not lose games. Loading leads to the game lobby, all humans must press "Ready" again.
- Open: SQLite is not part of the backend yet; it is also the base for R6, R12, R15 and R22. Not to be confused with saving a finished game for later viewing (R15).

### R6. Game log (`planned`)

Goal: a persisted, structured game log. The in-game log is shown below the table, but it is technical, hard to read (every action is one row) and not persisted.

- Backend table: participants, date and time, duration, final result; plus an event log per game. Shares the SQLite work with R4.
- Format: one compact, easy to parse text line per event (a code plus fields), so human-readable texts can be generated from it in any language later. The table log can group the lines per turn.
- Game events: player leaves, rejoins, is disconnected, reconnects, is removed or banned, does not react (timer expired), host changes a setting, final result.
- Throw events: round number, time since game start, player name, card name, dice result, chosen dice, final dice, turn result, dice points, total points.
- First step: check which data is needed for a replay (R13): seating order, the global dice animation setting, card order if the engine is seeded.
- Saved games keep their log assigned to the saving players (R15).

### R8. Spectators (`done`)

Done in spec 016. Visitors watch a running game anonymously and read-only; the games list shows "Watch" (same password and rate limit as joining), players and spectators see a counter of spectators, joining or leaving writes no log entry and shows no toast, spectators never influence timers, cleanup or the game end, and the host can switch spectating off (default on), which sends all spectators back to the lobby. A reload resumes watching. Protocol v11.

### R9. Rule options per game (`idea`)

- Goal: the host adjusts rules in the lobby, for example target score, enabled card types, number of cards per type, house rules from playtests. The new cards (R20) are one such option.
- Why: playtests already produced rule tweaks (Double Lotte, bonus Volle Lotte); options make variants testable without code changes.
- Constraints: the engine in `libs/game-rules` stays the single source of truth and defaults stay unchanged; every option shows up in the lobby, the table settings and `docs/rules.md`.

### R11. Sounds (`idea`)

- Goal: optional sound effects; the audio files are provided.
- Done already (spec 013): the victory sound when you win the game, played once together with the confetti.
- Sounds still open: a game start sound; timer sounds during the running game, such as a beep every second during the last 10 seconds of the turn timer; a distinct sound (for example a double bell) when it becomes your turn after the previous player busted or finished; applause on your own Volle Lotte.
- Constraints: one mute toggle in the menubar, remembered in `localStorage`; no autoplay before the first user interaction; assets stay small. Vibration on mobile is a possible addition (R3).

### R12. Statistics, history and highscore (`idea`, builds on R6 and R22)

- Highscore: a ranking of all players, either a paginated table or the top 20, with wins and total points; switchable category (wins or total points).
- Game history: the logged-in player sees the past games they took part in and the result of each (list in the lobby, see R15). Won games can be filtered there.
- Statistics per player: games played and won, average score, busts, Volle Lottes, favourite card. The admin table (R22) shows the operational variants (aborts, timer overruns).
- Constraints: without accounts, identity is the nickname plus token (see [migration.md](migration.md)), so a ranking is only meaningful per account (R22). Needs the persistence of R4 and R6.

### R13. Replay (`idea`, builds on R6)

- Goal: watch a finished game again ("re-live") from its persisted log, without a recording: the viewer is built purely by parsing the log (who sits where, rolling dice follow the viewer's global setting, and so on). Also useful to debug the computer AI (spec 011) and to reproduce bugs.
- Saved games stay assigned to the players who saved them (R15).
- Open: log granularity (needs dice and card order), a seeded engine makes replays small.

### R14. In-game reactions (`idea`)

- Goal: quick emotes or short chat messages between humans at the table.
- Constraints: rate-limited, plain text only (no HTML), host can mute; translated preset reactions are the safe first step before free chat.

### R15. Lobby rework: search, finished games, saved games (`idea`, needs R4, R6 and R22)

- Search: search the games list by name and filter by criteria (status, player count, own games, won games).
- "Finished" section: finished games stay listed until they are finally deleted and show the deletion time, so players know how long they remain. Today finished games are gone at once because nothing is persisted.
- Saving: a player can save a finished game; it then stays in their "Finished" section together with its log, assigned to every player who saved it, and can be watched again in the re-live (R13). Re-live needs the log rework (R6), which is a separate feature.
- History: a game history of the logged-in player (see R12).
- Open: retention time of unsaved finished games.

### R17. Starting player draw (`idea`)

- Goal: the starting player is drawn in a start animation: a modal with a spin-the-wheel animation of all active player names, then fireworks with the message "Player X is the starting player".
- Seat order: the player cards are numbered: the starting player gets 1, then humans in alphabetical order, then computers by their seat. Every player sees the same order; the current layout where your own card is always first no longer applies.
- Constraints: the draw is made on the server (no client-side randomness), all clients show the same result; the animation does not hold the turn timers.
- Open: touches the seat layout of spec 007 and 008; reuse the `Celebration` service (`apps/frontend/src/app/core/celebration.ts`, spec 013) for the fireworks.

### R18. Reshuffle step (`idea`)

- When a draw pile is empty and the cards must be reshuffled, the current player has to press a "Reshuffle" button.
- A new 30 second timeout runs below that button; when it expires, the cards are shuffled automatically and the player continues normally with "Draw" and the usual turn timer.
- The shuffle animation takes 5 seconds: the discard pile is shuffled and moves to the draw pile.
- Open: computers press the button after their normal pacing delay (spec 010); protocol change for the new phase.

### R19. Score change animations (`idea`)

- Gain: a green "+500" appears above the player's score and the score counts up like an odometer (rolling digits).
- Loss: the same with a red "-1000" (Plus/Minus card).
- Bust: when a player busts and loses the banked points of the turn, a red "-500" appears above the secured score and the points roll back to 0.
- Securing: every time a player banks, a green "+500" appears above "Secured: x points" and the points count up.
- Constraints: the Star score updates already wait for the final roll animation; the new animations follow the same rule and the "skip dice animation" setting; `prefers-reduced-motion`.

### R20. New cards (`idea`, option per game, see R9)

- Goal: an own game option in the settings that adds new card types to the deck. Card images are provided.
- Bonus 800 (3 times) and Bonus 1000 (2 times).
- Short Street (as often as the real Street): five in a row, so 1-5 or 2-6.
- Three of a kind (3 times) and four of a kind (3 times), each with 3 attempts. Check first whether they are too easy; if so, adjust the target points (for example 300 for three, 600 for four of a kind).
- Full House (3 times): a pair and three of a kind in one throw, 3 attempts. Check whether it is too easy; if so, adjust the points (for example 500).
- Work: engine and `docs/rules.md` (both languages), tooltips, computer AI (spec 011: odds for the new goals), protocol version, deck size shown in the settings.

### R21. Tournaments (`idea`, needs R22)

- Several tournament types: easy (easy opponents), medium (easy and medium), hard (medium and hard).
- A tournament section in the lobby with system-provided tournament settings: number of humans and computers, deck (standard or extended, see R20), computer speed, and so on.
- The system is the host: players cannot change any setting that influences the game. Only the participating player can leave and rejoin. As today, a tournament that nobody takes part in is deleted after 24 hours.
- Open: result and rewards (see R23); several rounds or a single game.

### R22. User accounts and administration (`idea`)

- Users: change name, change password, e-mail confirmation required; no admin needed who sends invitations or approves registrations. Also forgot password and profile picture (logic from Vaultfolio), SMTP.
- An admin role (for example the operator of the application) with an admin section:
  - a table of all registered players with statistics: games played, aborts (several aborts of the same game count as one), wins, Volle Lottes, timer overruns (every overrun counts);
  - a quick statistics page: total games played, running games, connected players, active players in running games;
  - a health page: current version, backend connection, database health.
- Presets of R10 move to the account: they are stored on the server per user, so they load on every device and browser, not only in the local storage of one client. The "settings cannot be saved on this device" notice of R10 is removed then, and existing local presets are offered for import on the first sign-in.
- Foundation for R12, R15, R21 and R23. Needs the persistence of R4 and R6.

### R23. Credits and cosmetics (`idea`, needs R22; builds on R21)

- Players earn credits per game (depending on the difficulty and number of opponents) and per tournament (depending on its settings).
- A small store redeems credits for cosmetics only: card patterns, modern versus hand-drawn cards, other dice, special player cards, other backgrounds (water, sky, lava, and so on).
- Sounds: for every sound type the game has or will have (victory, game start, timer), further sounds can be bought with credits in the store. Players pick them in their user settings, and the game plays the selected ones (R11 provides the sound types).
- Constraint: gameplay is never affected (no pay to win, no credits to win).
- Open: how cosmetics look to the other players at the table; assets must be provided.

### R24. Leaner socket messages (`idea`)

Goal: send much less data over the socket per change. Found in playtests: traffic grows during a game and most of every message is unchanged.

- Today: every accepted change pushes a full `game:state` (`toView` in `apps/backend/src/app/lobby/view.ts`) to every player and spectator. It contains the whole capped log (`log`, up to `LOG_CAP` = 500 entries) and all seats including names, although the log is also pushed incrementally as `game:log` (`entries`). So the log travels twice and grows to its cap.
- Quick wins, no protocol redesign:
  - drop `log` from `game:state` and send it only as a snapshot when a client (re)joins, rejoins, starts watching or reloads (`logBase` stays the cursor for later `game:log` deltas);
  - send seat identity (nicknames, computer names, host) only on join, rejoin, seat changes and rematch, not with every state; the per-turn state carries only seat indexes.
- Larger step: snapshot on connect, then diffs. A `version` counter per room; the server sends `{ from, to, patch }`, the client applies it and requests a fresh snapshot on a gap (reconnect, missed message). Candidates for a patch: current seat and phase, dice, selection, piles, scores, timers. A hand-written patch per field group is probably simpler and safer than a generic JSON patch.
- Static data (rules, card names, texts) is never sent; only ids.
- Encoding: Base64 would not help (it adds about 33%). Better: enable Socket.IO `perMessageDeflate` (check CPU cost and that nginx passes it) or a binary parser such as MessagePack; measure before choosing. Short field names only if the measurements justify the lost readability.
- Measure first: log the payload size per event over a full game (2 and 8 players, with spectators) as a baseline, and re-measure afterwards.
- Constraints: the reducer on the client must stay the single place that builds the view; protocol version bump (`PROTOCOL_VERSION`); a reconnect, a rematch and spectators must always get a complete snapshot; the backend integration tests cover the resync path. Shares the snapshot idea with R4 (save and load) and R13 (replay).
- Open: how large the payloads really are, whether the diff step is worth it after the quick wins.

### Later, not for the next releases

- Drag and drop for dice selection (tap is the current interaction).

## Ideas

- Accessibility: reduced-motion setting for the dice animation (respect `prefers-reduced-motion`), colour-blind safe card and score cues.
- Optional turn-time presets for the host (relaxed, normal, blitz) instead of single timer values.

- Screen-reader support for the timers on the table (live announcements of the turn timer and the game clock), found during spec 008.

Decision (spec 008): no separate minimum width; the scale rule alone applies, so portrait tablets (768x1024, scale 0.77) still show the table.
