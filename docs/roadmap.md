# Roadmap

Living list of completed features, upcoming work and ideas. Refine upcoming items here first; create a spec and its feature branch when an item is picked up, based on the current codebase. Every spec is compared against this file, and agents read it to know what is still open.

Last updated: 2026-10-21. The Java -> web migration is finished (see [migration.md](migration.md)); everything below is extension work.

## How to use

- Status: `idea` (scope still to refine), `planned` (scope agreed, no spec yet), `in progress` (spec exists), `done`.
- Keep the stable roadmap IDs when refining or reordering items; they are not spec numbers.
- Refine one item at a time: user story, scope, dependencies and open questions. The stories below are starting points, not finalized acceptance criteria.
- When work starts, run `/speckit-specify`, link the spec from the item, and update its status in the overview. Create plans and tasks against the codebase at that time, not in advance for the whole backlog.
- When the feature ships, move it to [Done](#done) with a short result, a spec link and the merge PR. Details belong in the spec.

## Done

| Spec                                                        | Feature                                                                                                                                                            | Merge PR                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| [001](../specs/001-rules-engine/spec.md)                    | Rules engine ported from Java, covering all card types and games with 2-8 players.                                                                                 | [#7](https://github.com/mallwang/volle-lotte/pull/7)   |
| [002](../specs/002-lobby-multiplayer/spec.md)               | Multiplayer lobbies and games with computer opponents and reconnect support.                                                                                       | [#8](https://github.com/mallwang/volle-lotte/pull/8)   |
| [003](../specs/003-ui-foundation-primeng/spec.md)           | PrimeNG UI foundation with the Terracotta theme in light and dark mode.                                                                                            | [#9](https://github.com/mallwang/volle-lotte/pull/9)   |
| [004](../specs/004-multi-language-i18n/spec.md)             | English and German UI and documentation.                                                                                                                           | [#12](https://github.com/mallwang/volle-lotte/pull/12) |
| [005](../specs/005-dice-pips-rolling-animation/spec.md)     | Pip dice faces, per-die rolling animations and paced computer turns.                                                                                               | [#13](https://github.com/mallwang/volle-lotte/pull/13) |
| [006](../specs/006-open-lobby-rejoin-timers/spec.md)        | Open lobbies, rejoining after computer replacement, per-phase turn timers, host removal and bans.                                                                  | [#14](https://github.com/mallwang/volle-lotte/pull/14) |
| [007](../specs/007-active-game-table-ui/spec.md)            | Active game table with player columns, card piles, dice and a game log.                                                                                            | [#16](https://github.com/mallwang/volle-lotte/pull/16) |
| [008](../specs/008-desktop-min-size-table-polish/spec.md)   | Desktop and tablet table scaling with small-window hints and accessibility polish.                                                                                 | [#23](https://github.com/mallwang/volle-lotte/pull/23) |
| [009](../specs/009-app-shell-menubar-leave-confirm/spec.md) | Shared app menubar, leave confirmation and light/dark toggle.                                                                                                      | [#25](https://github.com/mallwang/volle-lotte/pull/25) |
| [010](../specs/010-computer-speed-setting/spec.md)          | Host-controlled computer speed with five levels and a faster default.                                                                                              | [#27](https://github.com/mallwang/volle-lotte/pull/27) |
| [011](../specs/011-computer-ai-rework/spec.md)              | Computer decisions based on exact dice odds, configurable skill and independent risk preferences.                                                                  | [#28](https://github.com/mallwang/volle-lotte/pull/28) |
| [012](../specs/012-computer-player-names/spec.md)           | Generated English or German computer names that the host can rename or regenerate.                                                                                 | [#30](https://github.com/mallwang/volle-lotte/pull/30) |
| [013](../specs/013-game-over-modal/spec.md)                 | Game-over modal on the finished table with winner confetti and a victory sound.                                                                                    | [#32](https://github.com/mallwang/volle-lotte/pull/32) |
| [014](../specs/014-rematch-same-room/spec.md)               | Rematches in the same room, retaining settings, computers and reserved human seats.                                                                                | [#33](https://github.com/mallwang/volle-lotte/pull/33) |
| [015](../specs/015-remembered-settings/spec.md)             | Device-local remembered setups and up to ten named presets for creating and configuring games.                                                                     | [#34](https://github.com/mallwang/volle-lotte/pull/34) |
| [016](../specs/016-spectators/spec.md)                      | Read-only spectators for running games, controlled by the host and resumable after reload.                                                                         | [#35](https://github.com/mallwang/volle-lotte/pull/35) |
| [017](../specs/017-leaner-socket-messages/spec.md)          | Initial snapshots followed by numbered changes, with automatic resynchronization. Full-game traffic fell by 97-98% per recipient.                                  | [#36](https://github.com/mallwang/volle-lotte/pull/36) |
| [018](../specs/018-finer-socket-diffs/spec.md)              | Finer state diffs and a compact log reduced eight-player game traffic by another 61-62% per recipient. Measurements are in [socket-traffic.md](socket-traffic.md). | [#37](https://github.com/mallwang/volle-lotte/pull/37) |
| [019](../specs/019-sounds/spec.md)                          | Seven replaceable game sound cues with a device-local menubar mute setting.                                                                                        | [#38](https://github.com/mallwang/volle-lotte/pull/38) |
| N/A                                                         | Connection toasts and an offline page lock.                                                                                                                        | [#31](https://github.com/mallwang/volle-lotte/pull/31) |
| N/A                                                         | Host takeover when rejoining a computer-only game, and ending abandoned games from the games list.                                                                 | [#31](https://github.com/mallwang/volle-lotte/pull/31) |
| N/A                                                         | Correct single-card discard piles, easy-computer dice selection, Star score timing and Double Lotte completion.                                                    | [#29](https://github.com/mallwang/volle-lotte/pull/29) |
| N/A                                                         | Optional host-shared preview of the next throw's bust probability.                                                                                                 | [#29](https://github.com/mallwang/volle-lotte/pull/29) |
| N/A                                                         | Docker image, Portainer stack and release workflow.                                                                                                                | [#10](https://github.com/mallwang/volle-lotte/pull/10) |
| N/A                                                         | App icon, page titles and version in the header.                                                                                                                   | [#18](https://github.com/mallwang/volle-lotte/pull/18) |
| N/A                                                         | Manually run backend e2e flows, separate from unit tests and CI.                                                                                                   | [#20](https://github.com/mallwang/volle-lotte/pull/20) |

## Next

Ordered by current priority and prerequisites; effort is a rough guess: S (a few days, mostly one app), M (engine or protocol change plus UI), L (new subsystem or wide change), XL (new app or foundation for several items). Mobile PWA work is the current top priority. R26 stays last because it is only built if its gate is met.

| #                                                 | Title                                                                       | Status      | Effort |
| ------------------------------------------------- | --------------------------------------------------------------------------- | ----------- | ------ |
| [R3](#r3-mobile-app-as-installable-pwa)           | Mobile app as installable PWA ([spec 020](../specs/020-mobile-pwa/spec.md)) | in progress | XL     |
| [R19](#r19-score-change-animations)               | Score change animations                                                     | idea        | S      |
| [R27](#r27-start-countdown-screen)                | Start countdown screen                                                      | idea        | M      |
| [R17](#r17-starting-player-draw)                  | Starting player draw                                                        | idea        | M      |
| [R14](#r14-in-game-reactions)                     | In-game reactions                                                           | idea        | M      |
| [R18](#r18-reshuffle-step)                        | Reshuffle step                                                              | idea        | M      |
| [R9](#r9-rule-options-per-game)                   | Rule options per game                                                       | idea        | M      |
| [R20](#r20-new-cards)                             | New cards                                                                   | idea        | M      |
| [R2](#r2-e2e-suite-with-bots)                     | E2E suite with bots                                                         | planned     | L      |
| [R4](#r4-save-and-load-games)                     | Save and load games                                                         | planned     | L      |
| [R6](#r6-game-log)                                | Game log                                                                    | planned     | L      |
| [R13](#r13-replay)                                | Replay                                                                      | idea        | L      |
| [R22](#r22-user-accounts-and-administration)      | User accounts and administration                                            | idea        | XL     |
| [R12](#r12-statistics-history-and-highscore)      | Statistics, history and highscore                                           | idea        | L      |
| [R15](#r15-lobby-search-finished-and-saved-games) | Lobby search, finished and saved games                                      | idea        | L      |
| [R21](#r21-tournaments)                           | Tournaments                                                                 | idea        | L      |
| [R23](#r23-credits-and-cosmetics)                 | Credits and cosmetics                                                       | idea        | XL     |
| [R26](#r26-short-message-keys)                    | Short message keys                                                          | idea        | S      |

### R19. Score change animations

**User story:** As a player, I want score gains and losses to animate next to the affected score, so that I can understand each turn's result at a glance.

**Scope and constraints**

- Show a green gain (for example "+500") above a player's total and count the score up with rolling digits; show losses such as the Plus/Minus card in red (for example "-1000").
- When points are secured, show the green gain above "Secured: x points" and count up. On a bust, show the lost turn points in red and roll the secured score back to zero.
- Wait for the final dice animation, including Star rolls. Follow the skip-dice-animation setting and respect `prefers-reduced-motion`.

**Dependencies:** Existing score and dice-animation behavior; no new roadmap prerequisite.

**Open questions:** Define the reduced-motion presentation and how consecutive score updates are presented without obscuring the result.

### R27. Start countdown screen

**User story:** As a player, I want a shared countdown before the first turn, so that I have time to prepare and the game-start sound finishes before play begins.

**Scope and constraints**

- After the host presses Play, show a transition screen counting down from 10 to 0 before opening the table.
- Play the `game-start` cue on this screen instead of the lobby-to-running transition. The current sound is about nine seconds long and otherwise overlaps the first turn, its cue and timer.
- The server determines the start; turn timers and computer moves begin only after the countdown. All humans see the same countdown, including the remaining time after reload.
- Use the same screen for rematches. Show the countdown when muted and respect `prefers-reduced-motion`.

**Dependencies:** Sound cues ([spec 019](../specs/019-sounds/spec.md)) and rematch behavior. Coordinate with R17 if both become one start sequence.

**Open questions:** New phase or start timestamp and the resulting protocol-version change; host cancellation; late arrivals and spectators; interaction with the starting-player draw.

### R17. Starting player draw

**User story:** As a player, I want to see the starting player drawn and the resulting seat order, so that the opening of the game is clear to everyone.

**Scope and constraints**

- Show a modal with a spin-the-wheel animation of active player names, followed by fireworks and "Player X is the starting player".
- Draw on the server; every client shows the same result and order.
- Number the player cards: starting player first, then the remaining humans alphabetically, then the remaining computers by seat. Replace the current own-card-first layout.
- The animation does not hold turn timers.

**Dependencies:** Table layout ([spec 007](../specs/007-active-game-table-ui/spec.md), [spec 008](../specs/008-desktop-min-size-table-polish/spec.md)) and the shared celebration service ([spec 013](../specs/013-game-over-modal/spec.md)).

**Open questions:** How to combine the draw with R27, whose countdown delays turn timers; reduced-motion presentation.

### R14. In-game reactions

**User story:** As a player, I want to send quick reactions to other humans at the table, so that we can interact without leaving the game.

**Scope and constraints**

- Start with translated preset reactions; consider short free-text messages later.
- Rate-limit messages, allow plain text only and let the host mute reactions.

**Dependencies:** No new roadmap prerequisite.

**Open questions:** Initial reaction set, display location and duration, rate limits, mute scope and whether free chat belongs in a later feature.

### R18. Reshuffle step

**User story:** As the current player, I want to trigger and see a reshuffle when the draw pile is empty, so that the transition to a fresh pile is understandable.

**Scope and constraints**

- Offer a "Reshuffle" button with a separate 30-second timeout below it; shuffle automatically when it expires.
- Animate the discard pile being shuffled and moved to the draw pile for five seconds.
- Afterwards, continue with "Draw" and the usual turn timer. Computers trigger reshuffling after their normal pacing delay.

**Dependencies:** Computer pacing ([spec 010](../specs/010-computer-speed-setting/spec.md)); engine and protocol support for the new phase.

**Open questions:** Exact timer transitions around the animation and behavior after disconnect or reload.

### R9. Rule options per game

**User story:** As a host, I want to configure rule variants in the lobby, so that my group can try different decks and house rules without code changes.

**Scope and constraints**

- Consider target score, enabled card types, quantities per type and house rules informed by playtests, including Double Lotte and bonus Volle Lotte.
- Provide the game option needed for the new cards in R20.
- Keep the shared rules engine authoritative and existing defaults unchanged.
- Reflect every option in the lobby, table settings and [rules.md](rules.md).

**Dependencies:** Existing game settings and rules engine; foundation for R20.

**Open questions:** Which options belong in the first release, allowed values and combinations, and compatibility with remembered setups and presets.

### R20. New cards

**User story:** As a host, I want to enable an extended deck, so that my group can play with additional dice challenges.

**Scope and constraints**

- Add Bonus 800 (three cards) and Bonus 1000 (two cards).
- Add Short Street (1-5 or 2-6), with the same quantity as Street.
- Add three cards each for three of a kind and four of a kind, each allowing three attempts. Check difficulty before fixing rewards; candidates are 300 and 600 points.
- Add three Full House cards: a pair and three of a kind in one throw, with three attempts. Check difficulty before fixing the reward; a candidate is 500 points.
- Card images are provided. Update the engine, English and German rules, tooltips, computer odds, protocol version and displayed deck size.

**Dependencies:** R9; computer AI from [spec 011](../specs/011-computer-ai-rework/spec.md).

**Open questions:** Difficulty and final rewards for the new challenges; precise selection rules across attempts.

### R2. E2E suite with bots

**User story:** As a maintainer, I want real games exercised by bots and browser clients, so that gameplay and UI regressions are caught before release.

**Scope and constraints**

- Build on the backend socket-level e2e tests and the `run-e2e` skill.
- Run manually through a dedicated skill, never in CI.
- Add browser flows with Playwright and stable `data-testid` selectors; update the `verify-ui` skill's throw-away-script guidance as part of this work.
- Cover different bot strengths, many seeded games, player counts, languages, reconnects, timeouts and protocol-version mismatch.
- Try [Lightpanda](https://github.com/lightpanda-io/browser) as an optional second Playwright project via `connectOverCDP`, including two player contexts. It can check socket and DOM state, but cannot replace Chromium for layout and focus checks.

**Dependencies:** Existing backend e2e flows; check current browser tooling and selector coverage when specifying.

**Open questions:** Initial flow matrix, deterministic seed support, acceptable runtime and whether Lightpanda adds enough value.

### R4. Save and load games

**User story:** As a host, I want to save and resume a game, so that a break, server restart or update does not lose our progress.

**Scope and constraints**

- Save server-side and allow the host to load later, using the existing immutable JSON state (`toJSON`/`fromJSON`).
- Introduce SQLite persistence and persist after every turn.
- Loading returns to the game lobby; every human must confirm "Ready" again.
- This restores playable games, unlike R15's saved finished games for later viewing.

**Dependencies:** Existing game-state serialization; persistence foundation for R6, R12, R15 and R22.

**Open questions:** Save/load controls, ownership before accounts exist, retention and recovery of a partially completed turn.

### R6. Game log

**User story:** As a player, I want a readable, persisted record of a game, so that I can review what happened and later replay it.

**Scope and constraints**

- Store participants, timestamps, duration and final result, plus a structured event log per game.
- Use one compact, parseable text line per event (code plus fields), from which localized text can be generated. Group entries by turn in the table log.
- Record leaving, rejoining, disconnects, reconnects, removal, bans, timer expiry, host setting changes and the final result.
- Record throw context: round, elapsed time, player, card, dice result, selected and final dice, turn result, dice points and total points.
- Check replay requirements first: seating order, dice-animation preferences and card order if the engine is seeded.
- Keep logs of saved games assigned to the saving players through R15.

**Dependencies:** R4; foundation for R13 and the history features.

**Open questions:** Replay-complete event schema, log grouping and presentation, retention, and which current technical entries can be reused.

### R13. Replay

**User story:** As a player, I want to relive a finished game from its saved log, so that I can review memorable turns or reproduce unexpected behavior.

**Scope and constraints**

- Build the viewer entirely from parsed log events, not a video recording.
- Reconstruct seating and game actions; use the viewer's global dice-animation setting.
- Support computer-AI debugging and bug reproduction.
- Keep saved games assigned to the players who saved them through R15.

**Dependencies:** R6. Coordinate saved-game access with R15; replay data requirements must be considered while designing the log.

**Open questions:** Required dice and card-order detail, whether a seeded engine can reduce replay size, and playback controls.

### R3. Mobile app as installable PWA

**User story:** As a phone user, I want a dedicated, installable mobile interface, so that I can comfortably play without changing the desktop and tablet experience.

**Scope and constraints**

- Create a separate Nx frontend using Angular and Capacitor, communicating with the backend over WebSocket and sharing rules and protocol types within the `scope:*` boundaries. Capacitor is the agreed PWA foundation and keeps native app options open for a future feature.
- Serve mobile users from the public URL, `https://volle-lotte.allwang.family`, with an option to install on the home screen.
- Provide a manifest, icons and an Angular service worker. Activate updates only in the lobby or after a game, never mid-game; require an update on protocol-version mismatch.
- Do not cache `index.html` or `ngsw.json`; cache hashed assets long-term.
- No native store publishing for this step. No separate desktop PWA is needed; the desktop and tablet layout remains unchanged.
- The mobile lobby and game table must be designed for phone-sized screens, including touch use; do not rely on scaling the desktop table to fit.

**Dependencies:** Existing protocol-version reporting, desktop/tablet scope ([spec 008](../specs/008-desktop-min-size-table-polish/spec.md)) and sounds ([spec 019](../specs/019-sounds/spec.md)); no new roadmap prerequisite.

**Open questions:** Mobile/desktop selection, user-agent routing or a linked `/m/` build; shared or separate deployment. User-agent routing must not break update caching. The feature specification is [020](../specs/020-mobile-pwa/spec.md).

### R22. User accounts and administration

**User story:** As a player, I want an optional account for my identity and settings across devices; as an operator, I want an administration area to monitor players and application health.

**Scope and constraints**

- Support self-registration with e-mail confirmation, name and password changes, password recovery and a profile picture. No invitation or admin approval is required; use SMTP and consider the existing Vaultfolio logic.
- Add an admin role and a player table with games played, aborts, wins, Volle Lottes and timer overruns. Count repeated aborts of one game once, but every timer overrun.
- Show total and running games, connected players and active players in running games; show version, backend connection and database health.
- Move device-local presets from [spec 015](../specs/015-remembered-settings/spec.md) to per-user server storage. Offer local-preset import on first sign-in and remove the device-storage warning for account-backed presets.

**Dependencies:** R4 and R6; foundation for R12, R15, R21 and R23.

**Open questions:** Anonymous-to-account identity migration, profile-image storage, admin-role assignment and the account/anonymous settings experience.

### R12. Statistics, history and highscore

**User story:** As a signed-in player, I want to see my past results and compare statistics, so that I can follow my progress over time.

**Scope and constraints**

- Provide a ranking by wins or total points, as a paginated table or a top 20.
- Show past games and results for the signed-in player, including a won-games filter in the lobby history (R15).
- Show games played and won, average score, busts, Volle Lottes and favourite card.
- Keep operational statistics such as aborts and timer overruns in R22's administration view.
- Rank accounts, not anonymous nickname/token identities; see [migration.md](migration.md).

**Dependencies:** R4, R6 and R22; coordinate the lobby history surface with R15.

**Open questions:** Ranking presentation, statistical definitions, visibility and treatment of games played before account registration.

### R15. Lobby search, finished and saved games

**User story:** As a player, I want to find games and keep finished ones, so that I can revisit my results and replay games I saved.

**Scope and constraints**

- Search by game name and filter by status, player count, own games and won games.
- Keep finished games listed until deletion and show their deletion time.
- Let each player save a finished game and its log in their own "Finished" section; one game can be assigned to several saving players.
- Provide the signed-in player's game history (R12) and access to replays (R13).

**Dependencies:** R4, R6 and R22; R13 for replay viewing and coordination with R12 for history.

**Open questions:** Retention for unsaved finished games, saved-game deletion and how history and saved games share the lobby.

### R21. Tournaments

**User story:** As a player, I want to enter system-hosted challenges with fixed settings, so that I can compete under consistent conditions.

**Scope and constraints**

- Offer easy (easy opponents), medium (easy and medium) and hard (medium and hard) tournament types.
- Provide a tournament section with system-defined human/computer counts, deck, computer speed and other settings.
- The system is host; players cannot alter settings that influence play. Only a participating player can leave and rejoin their place.
- Delete a tournament after 24 hours without participants, matching current abandoned-game cleanup.

**Dependencies:** R22; R20 if extended decks are offered. Coordinate rewards with R23.

**Open questions:** Single game or multiple rounds, results, rewards and participation rules.

### R23. Credits and cosmetics

**User story:** As a player, I want to earn credits and unlock cosmetic choices, so that I can personalize the game without changing anyone's chance of winning.

**Scope and constraints**

- Award credits per game based on opponent difficulty and count, and per tournament based on its settings.
- Offer cosmetics only: card patterns, modern or hand-drawn cards, dice, player cards and backgrounds such as water, sky or lava.
- Offer additional sounds for every cue type, selected in user settings; [spec 019](../specs/019-sounds/spec.md) provides the current types.
- Never affect gameplay: no pay to win and no credits to win. Assets must be provided.

**Dependencies:** R22; builds on R21 for tournament rewards.

**Open questions:** Earning and pricing rules, visibility of cosmetics to other players, asset availability and selected-sound delivery.

### R26. Short message keys

**User story:** As an operator, I want smaller socket messages only when the measured saving justifies the complexity, so that bandwidth improves without unnecessary protocol work.

**Scope and constraints**

- Consider shortening keys such as `playerId` to `pid` and `seats` to `s` from one frontend/backend table (`wire-keys.ts`), applied at the send boundary through `shortenKeys` / `expandKeys`.
- If built, test that every wire key has an entry.
- The estimate in [spec 018](../specs/018-finer-socket-diffs/spec.md), Story 4, saved 23.1% per player (109,262 instead of 142,121 bytes in an eight-player game), below the 25% gate. See [socket-traffic.md](socket-traffic.md#short-keys-not-built) and `keyTableEstimate` in the backend traffic measurement helper.
- Measure again with `npm run measure:socket`. Build only if traffic matters at that time or other changes push savings over the gate; browser traffic becomes less readable.

**Dependencies:** Do last, after other protocol changes, and only if its gate is met.

**Open questions:** Updated measured savings and whether the operational benefit warrants reduced readability.

## Ideas

- Accessibility: reduced-motion setting for the dice animation (respect `prefers-reduced-motion`), colour-blind safe card and score cues.
- Optional turn-time presets for the host (relaxed, normal, blitz) instead of single timer values.
- Screen-reader support for the timers on the table (live announcements of the turn timer and the game clock), found during spec 008.

Decision ([spec 008](../specs/008-desktop-min-size-table-polish/spec.md)): no separate minimum width; the scale rule alone applies, so portrait tablets (768x1024, scale 0.77) still show the table.
