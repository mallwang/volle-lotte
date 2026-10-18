# Roadmap

Living list of what is done, what is next and what is only an idea. New ideas go here first; a spec is created when an item is picked up. Every spec is compared against this file, and agents read it to know what is still open.

Last updated: 2026-10-18. The Java -> web migration is finished (see [migration.md](migration.md)); everything below is extension work.

## How to use

- Status: `idea` (noted, not discussed), `planned` (scope agreed, no spec yet), `in progress` (spec exists), `done`.
- Pick an item, run `/speckit-specify`, put the spec number in the item, and set the status. When the feature ships, move it to [Done](#done) with a one-line result.
- Keep items short: goal, why, constraints, open questions. Details belong in the spec.

## Done

| Spec | Feature                                                                                                                                                                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001  | Rules engine (`libs/game-rules`), port of the Java game with all card types and 2-8 players                                                                                                                                                                                                    |
| 002  | Lobby and multiplayer (NestJS gateway, Socket.IO, computer players with difficulties, reconnect)                                                                                                                                                                                               |
| 003  | UI foundation (PrimeNG, Terracotta theme, light/dark)                                                                                                                                                                                                                                          |
| 004  | English and German UI and documentation                                                                                                                                                                                                                                                        |
| 005  | Pip dice faces, per-die rolling animation, computer pacing                                                                                                                                                                                                                                     |
| 006  | Open lobbies, rejoin after replacement by a computer, per-phase turn timers, host removal and bans                                                                                                                                                                                             |
| 007  | Active game table UI (seat columns, piles, dice area, log); desktop layout is the target, see below                                                                                                                                                                                            |
| 008  | Desktop minimum size: header and table scale as one 992x900 stage (minimum 695x630, scale 0.7), scaling notice and "window too small" hint, global focus ring, tab order and contrast checked                                                                                                  |
| 009  | App shell: PrimeNG menubar on every screen (active page, "Current game" status), one shared leave confirmation (navbar, browser back, table and lobby buttons), light/dark-only theme with a sun/moon button; create-game form restyle (P3) dropped, it stays as is until the form is reworked |
| 010  | Computer speed setting: host slider 1-5 (default 3, faster than before) in lobby and table settings, one shared pacing table, toast on setting changes, protocol v5                                                                                                                            |
| -    | Docker image and Portainer stack, release workflow, app icon, page titles, version in the header                                                                                                                                                                                               |
| -    | Backend integration tests as manual e2e (`npm run test:e2e`, skill `run-e2e`), kept out of CI                                                                                                                                                                                                  |

## Next

### R7. Computer player AI rework (`in progress`, spec 011)

Goal: computer players that decide by expected value instead of fixed thresholds, with a separate risk setting.

- Skill `easy | medium | hard | random` and risk `none | medium | high | random` per computer seat. `random` is resolved per decision, never per game.
- Decisions come from exact odds (dice outcomes per number of free dice) and a memoised value function, not from hand-written special cases: which dice to set aside, bank or throw, and draw or bank after a Volle Lotte on a Bonus card (card odds from `rules.cardCounts`, never from the real deck).
- Street, Double Lotte, Plus/Minus (and Clover, Star): always set aside all possible dice, for every skill.
- Risk is one loss-aversion parameter; "high" is shifted strongly towards drawing but not blind. The score situation (deficit to the leader, distance to the target) shifts it further.
- Open: protocol bump, seat UI for the risk setting, balance by bot tournaments (overlaps R2).

### R2. E2E suite with bots (`planned`)

Goal: a thorough suite that plays real games with bots of different strength and checks the functionality and the UI. Run manually through its own skill, never in CI.

- Starting point: `apps/backend/src/app/lobby/*.e2e.spec.ts` (socket level, no browser) and the `run-e2e` skill.
- Add Playwright for the UI (not installed in this repo yet; the `verify-ui` skill still says "throw-away scripts only", update it with this item). Stable selectors need `data-testid` attributes; there are none today.
- Spike: try [Lightpanda](https://github.com/lightpanda-io/browser) as an optional second Playwright project (`connectOverCDP`) for the flow checks (socket and DOM state, two player contexts). It has no layout or rendering engine, so it cannot replace Chromium for layout and focus checks (R1).
- Ideas: bots of all difficulties against each other, many seeded games, UI checks per player count and language, reconnect and timeout flows in the browser, protocol version mismatch.

### R3. Mobile app (`idea`, discuss overlap with R5)

Goal: a separate mobile frontend, so the desktop frontend stays desktop only. Idea: a new Nx application with Capacitor that talks to the backend over WebSocket on its own.

- One public URL (`https://volle-lotte.allwang.family`). A native Capacitor app does not need the URL to tell devices apart: it bundles its assets and only connects to the backend. The question is what a phone browser sees:
  - A: client-side detection in the desktop app (`matchMedia('(pointer: coarse)')` and width) that shows "get the app / continue anyway" (recommended, simple and robust);
  - B: user-agent sniffing in NestJS (brittle, interferes with the no-cache rule for `index.html`);
  - C: serve the mobile build as a web app under `/m/` as well, so phones work without a store install and Capacitor wraps the same code.
- Backend: allow the Capacitor origins (`capacitor://localhost`, `https://localhost`) for Socket.IO (CORS). App store updates lag behind, so the backend must tolerate older `PROTOCOL_VERSION` values or the app must show "update required".
- Costs: Google Play about 25 USD once, Apple Developer about 99 USD per year; a sideloaded APK is free.
- Shared code: `libs/game-rules` (protocol types, rules); keep `scope:*` tags in mind for a new app.
- Open question: what does Capacitor give over a responsive mobile PWA (store presence, push notifications)? Decide together with R5.
- Depends on R1 (clear desktop scope).

### R4. Save and load games (`planned`)

- Host saves a game server-side and loads it later; the game state is already immutable JSON (`toJSON`/`fromJSON`).
- Persist after every turn in SQLite so restarts do not lose games. Loading leads to the game lobby, all humans must press "Ready" again.
- Open: SQLite is not part of the backend yet.

### R5. PWA and safe updates (`planned`)

- Angular service worker; an update is only activated in the lobby or after the game, never mid-game. The backend reports a `protocolVersion` (exists, see `PROTOCOL_VERSION`).
- Do not cache `index.html` and `ngsw.json`, cache hashed assets for long.
- Open: overlap with R3 (a PWA could cover phones). Clarify before specifying either.

### R6. Game log (`planned`)

- Backend table: participants, date and time, duration, final result; plus an event log per game (the in-game log exists, but it is not persisted).
- Shares the SQLite work with R4.

### Later, not for the next releases

- Accounts: invitations, e-mail confirmation, forgot and change password, profile picture (logic from Vaultfolio), SMTP, invitation by nickname with deep link.
- Drag and drop for dice selection (tap is the current interaction).

## Ideas

- Screen-reader support for the timers on the table (live announcements of the turn timer and the game clock), found during spec 008.

Decision (spec 008): no separate minimum width; the scale rule alone applies, so portrait tablets (768x1024, scale 0.77) still show the table.
