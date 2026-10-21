# Implementation Plan: M2 Mobile Game Table

**Branch**: `023-mobile-game-table` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/023-mobile-game-table/spec.md`; binding layout in [design.md](design.md) and [mockup.html](mockup.html).

## Summary

Replace the M1 "started" placeholder of the mobile app (`/m/`) with a landscape-only game table for seated players: players column, board (rules, turn timer, card, turn points, dice, status line) and an actions column, for 2-8 seats. The server stays authoritative: the phone sends the existing `turn:action` and `turn:preview` intents and renders the `GameView` it receives; no protocol change. A rotate blocker overlays the table in portrait while the table stays mounted, so selection and state survive rotation. The table is a phone-specific component in `apps/mobile` (plain CSS, no PrimeNG). Pure view logic (seat views, risk, labels, log text) moves into `libs/client-core` so desktop and phone share it; the dice-roll reveal is a small port, confetti reuses the already installed `party-js` (lazy-loaded). Visible turn timer, disconnected and replaced-by-computer seat states, leave confirmation and game-over dialog are in scope; sounds, log, rematch, spectators and reconnect banners stay in M3.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular (standalone components, signals), NestJS backend unchanged

**Primary Dependencies**: existing only: Angular, `game-rules`, `client-core`, `socket.io-client`, `party-js` (root dependency, already used by desktop). No new dependency.

**Storage**: N/A (no new persistence; the session token is already stored by M1; the table keeps selection in memory only)

**Testing**: Jest (`jest-preset-angular`) for `apps/mobile` and `libs/client-core`; existing desktop specs must pass unchanged after the extraction; `npm run test:e2e` via the `run-e2e` skill for a mixed desktop and phone game (manual, not in CI)

**Target Platform**: current Chrome on Android and Safari on iOS, phone landscape 568-932 × 320-430 CSS px; installable PWA (served at `/m/`)

**Project Type**: web application (Nx monorepo; this feature touches `apps/mobile` and `libs/client-core`, and only refactors desktop imports)

**Performance Goals**: table renders and updates a server change within one frame budget (no layout thrash); dice animation 60 fps on mid-range phones; no extra socket traffic (SC unchanged vs desktop, see [docs/socket-traffic.md](../../docs/socket-traffic.md))

**Constraints**: one screen, no scroll, no zoom, no horizontal scroll; safe-area padding; controls ≥ 48 px high; `anyComponentStyle` budget 4 kb warning / 8 kb error per component, so table styles are split across the table sub-components; mobile may only import `scope:shared`; reduced motion honoured

**Scale/Scope**: 1 new screen (table) with 5 small components, 1 dialog (leave), 1 dialog (game over), 1 blocker; about 25 new i18n keys (en, de)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                     | Pre-research                                                                        | Post-design                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| I. Server-authoritative       | Pass: only intents sent, view rendered as received, no optimistic changes (FR-013). | Pass: dice roll animation is presentation only; pending flag only blocks repeats, never alters state.                         |
| II. Pure, tested rules engine | Pass: no rules in the client; hints use existing `nextThrowRisk`.                   | Pass: shared helpers are pure functions in `client-core`; no decisions taken client-side.                                     |
| III. Test coverage            | Pass: new logic ships with specs.                                                   | Pass: helpers, service additions and each component have specs; template-only blocker is covered by the table spec.           |
| IV. One container, SQLite     | Pass: no backend change.                                                            | Pass: unchanged; PWA update stays lobby-only.                                                                                 |
| V. Anonymous play             | Pass: reuses M1 session.                                                            | Pass: no new identity or secret handling.                                                                                     |
| VI. UX first                  | Pass: touch targets, labels, safe areas, reduced motion, no color-only info.        | Pass: active seat uses border + ▶ + fill; disabled reasons shown as text; `/speckit-ux-review` done (design.md, mockup.html). |
| VII. Simplicity               | Pass: no new dependency.                                                            | Pass: see Complexity Tracking (none).                                                                                         |

## Project Structure

### Documentation (this feature)

```text
specs/023-mobile-game-table/
├── plan.md
├── spec.md
├── design.md
├── mockup.html
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── socket-intents.md
│   └── routes-and-ui.md
└── tasks.md             # created by /speckit-tasks, not by this command
```

### Source Code (repository root)

```text
libs/client-core/src/
├── lib/
│   ├── table-view.ts        # moved from apps/frontend core/table-view.ts (pure)
│   └── game-view.ts         # moved pure helpers from apps/frontend core/game-view.ts
└── index.ts                 # exports the above

apps/frontend/src/app/core/
├── table-view.ts            # re-exports from client-core (specs keep passing)
└── game-view.ts             # re-exports from client-core

apps/mobile/src/
├── index.html               # viewport: add maximum-scale=1, user-scalable=no
└── app/
    ├── app.routes.ts        # `started` removed; `table/:id` added
    ├── core/
    │   ├── mobile-socket.service.ts   # + action(), preview(), pending signal, settingsChanged
    │   ├── dice-roll.ts               # small port of desktop DiceRollService
    │   └── celebration.ts             # lazy party-js, reduced motion aware
    ├── table/
    │   ├── table.ts                   # container: state, actions, orientation overlay
    │   ├── table-players.ts           # seat rows (2-8)
    │   ├── table-board.ts             # strip, timer, card, turn points, dice, status
    │   ├── table-actions.ts           # action buttons + reason text
    │   ├── leave-dialog.ts
    │   └── game-over.ts
    ├── game-lobby/game-lobby.ts       # navigates to table when the game is running
    ├── list/list.ts                   # running own game goes to table
    └── i18n/mobile-{en,de}.ts         # table keys
```

**Structure Decision**: Phone-specific table components in `apps/mobile` (plain CSS, per M1), shared pure logic in the existing `libs/client-core` (scope:shared). The desktop keeps its components; only its two helper files become thin re-exports. The table is its own route `table/:id` with the same guards as the lobby, instead of a phase switch inside `GameLobby`, so the lobby stays untouched.

## Complexity Tracking

No constitution violations; nothing to justify.
