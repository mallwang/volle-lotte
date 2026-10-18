# Roadmap

Living list of what is done, what is next and what is only an idea. New ideas go here first; a spec is created when an item is picked up. Every spec is compared against this file, and agents read it to know what is still open.

Last updated: 2026-10-18. The Java -> web migration is finished (see [migration.md](migration.md)); everything below is extension work.

## How to use

- Status: `idea` (noted, not discussed), `planned` (scope agreed, no spec yet), `in progress` (spec exists), `done`.
- Pick an item, run `/speckit-specify`, put the spec number in the item, and set the status. When the feature ships, move it to [Done](#done) with a one-line result.
- Keep items short: goal, why, constraints, open questions. Details belong in the spec.

## Done

| Spec | Feature                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------- |
| 001  | Rules engine (`libs/game-rules`), port of the Java game with all card types and 2-8 players         |
| 002  | Lobby and multiplayer (NestJS gateway, Socket.IO, computer players with difficulties, reconnect)    |
| 003  | UI foundation (PrimeNG, Terracotta theme, light/dark)                                               |
| 004  | English and German UI and documentation                                                             |
| 005  | Pip dice faces, per-die rolling animation, computer pacing                                          |
| 006  | Open lobbies, rejoin after replacement by a computer, per-phase turn timers, host removal and bans  |
| 007  | Active game table UI (seat columns, piles, dice area, log); desktop layout is the target, see below |
| -    | Docker image and Portainer stack, release workflow, app icon, page titles, version in the header    |
| -    | Backend integration tests as manual e2e (`npm run test:e2e`, skill `run-e2e`), kept out of CI       |

## Next

### R1. Desktop minimum size and table polish (`in progress`, spec 008)

Goal: find one minimum window size that works for every desktop browser user and optimise the table for it. The current frontend is for desktop (and perhaps tablets in landscape) only.

- Today the board is fixed at 44 rem height plus header: the page is about 916 px tall, so a 1366x768 laptop (about 620-650 px of browser viewport) scrolls. Proposal: minimum viewport 1024x640 (landscape tablets, 1366x768 laptops), optimised for about 1280x650 and larger, with a "window too small" hint below it. The board height must follow the viewport instead of the fixed 44 rem. Measure first (Playwright, all phases: drawing, rolling, selecting, bust, at 1024x640, 1280x650 and 1920x950) and put the table into the spec.
- Open items from spec 007 (T031, T033, moved here), found by a Playwright walk-through at 1024 and 1440 px, 2/4/8 players, light/dark, EN/DE:
  - at 1024 px the left and right seat columns are cut off at the viewport edge;
  - the focus ring is only 1 px;
  - seats are not keyboard focusable, and the tab order puts the header after the table ("Log" comes before it);
  - no overlaps, no horizontal scroll, contrast 8.6:1 or better.
- Still unchecked: playing a turn (throw, select, bank, bust notice). The manual two-browser run of spec 002 (T045) is closed as covered by the e2e flows; its UI part belongs to R2. A short manual smoke test after this item is enough.
- Target layout for desktop: seats in two columns, own seat top left, turn order alternating right and left (see [specs/007-active-game-table-ui/design.md](../specs/007-active-game-table-ui/design.md)).

### R2. E2E suite with bots (`planned`)

Goal: a thorough suite that plays real games with bots of different strength and checks the functionality and the UI. Run manually through its own skill, never in CI.

- Starting point: `apps/backend/src/app/lobby/*.e2e.spec.ts` (socket level, no browser) and the `run-e2e` skill.
- Add Playwright for the UI (not installed in this repo yet; the `verify-ui` skill still says "throw-away scripts only", update it with this item). Stable selectors need `data-testid` attributes; there are none today.
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
