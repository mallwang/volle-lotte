# Implementation Plan: App Shell Navbar and Leave-Game Confirmation

**Branch**: `009-app-shell-menubar-leave-confirm` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-app-shell-menubar-leave-confirm/spec.md`, approved layout in [design.md](design.md)

## Summary

Replace the hand-built header navigation with a PrimeNG Menubar (custom item template, `start` and `end` slots) that stays visible in every phase and highlights the open page. Route all "leave a game or lobby" paths through one `LeaveGame` service that opens a PrimeNG ConfirmDialog; a functional `canDeactivate` guard on `game/:id` uses it for navbar clicks and browser back, and the table and lobby buttons call it directly. Reduce the theme to light and dark with a PrimeIcons button. Optionally (P3) align the create-game form. Frontend only: no server, protocol or rules change.

## Technical Context

**Language/Version**: TypeScript 5, Angular (standalone components, signals), versions as in `package.json`

**Primary Dependencies**: PrimeNG 22 (`primeng/menubar`, `primeng/confirmdialog`, `primeng/api` `ConfirmationService`, existing `button`, `select`, `tag`), PrimeIcons; no new dependency

**Storage**: N/A. The theme choice keeps the existing `vl-theme` localStorage key (values `light`/`dark`; any other value is ignored)

**Testing**: Vitest unit tests next to the code (as in `apps/frontend`): `ThemeService`, new `LeaveGame` service and guard, `App` (menubar entries, active state, status entry, theme button), `Table` and `GameLobby` (button opens the shared dialog), axe checks via `expectNoA11yViolations` in both themes; throw-away Playwright script (skill `verify-ui`) for browser back, real focus handling and the 695 px menubar. No permanent e2e (roadmap R2)

**Target Platform**: Desktop browsers and landscape tablets (Chromium, Firefox, Safari current)

**Project Type**: Web application (Nx monorepo), change limited to `apps/frontend`

**Performance Goals**: Dialog and highlight update in the same frame as the navigation; no extra network traffic

**Constraints**: Do not touch the scale logic, the table internals, the dice, the log or the open-games list (FR-017). Dialogs and toasts stay outside the scaled stage. Menubar must not collapse into the hamburger layout at the 695 px minimum width

**Scale/Scope**: Shell (`app.html`/`app.ts`), 2 pages' leave buttons (table, game lobby), theme service, i18n (en, de), user guide

## Constitution Check

| Principle                 | Status | Note                                                                                              |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| I. Server-authoritative   | Pass   | Only presentation. Leaving still goes through the existing `game:leave` intent                    |
| II. Pure rules engine     | Pass   | `libs/game-rules` untouched                                                                       |
| III. Test coverage        | Pass   | New logic (situation, guard, theme) is unit tested; template-only wiring may be skipped           |
| IV. One container, SQLite | Pass   | No backend change, no protocol bump                                                               |
| V. Anonymous play         | Pass   | Not affected                                                                                      |
| VI. UX first              | Pass   | Mockup reviewed ([design.md](design.md)); keyboard, focus return, contrast and no colour-only cue |
| VII. Simplicity           | Pass   | One service, one guard, PrimeNG components instead of hand-built markup; no new dependency        |

Post-design re-check: still passes. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/009-app-shell-menubar-leave-confirm/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui-contract.md
├── design.md, mockup.html
└── tasks.md             # created by /speckit-tasks
```

### Source Code

```text
apps/frontend/src/
├── styles.css                          # drop .vl-nav; menubar band (max 1200 px), active entry, status entry
└── app/
    ├── app.html / app.ts               # p-menubar (start/item/end templates), p-confirmdialog, items computed from session/game
    ├── app.config.ts                   # provide ConfirmationService
    ├── app.routes.ts                   # canDeactivate: [leaveGameGuard] on game/:id
    ├── core/
    │   ├── leave-game.ts               # LeaveGame service (situation, confirm, request) + leaveGameGuard
    │   ├── leave-game.spec.ts
    │   ├── socket.service.ts           # leave() returns whether it worked and reports a failure
    │   └── theme.service.ts            # light/dark only, toggle(), initial value from the device preference
    ├── game/game.ts                    # redirect effect skips while a guarded leave is in progress
    ├── table/table.ts                  # remove own leave p-dialog and leaveOpen; button calls LeaveGame.request()
    ├── game-lobby/game-lobby.ts        # Leave/Withdraw button calls LeaveGame.request()
    ├── create-game/create-game.ts      # P3 only
    └── i18n/en.ts, de.ts               # leave texts per situation, theme texts without "system"
docs/user-guide.md                      # section 4: header navigation, light/dark
```

**Structure Decision**: Existing Angular app only. `LeaveGame` is a root service so `App` (dialog host), the guard, `Table` and `GameLobby` share one confirmation without coupling to each other.

## Decisions (details in [research.md](research.md))

1. Menubar with a custom `item` template (router link, `routerLinkActive`, `aria-current`), `breakpoint` set so it never switches to the hamburger layout.
2. "Current game" is a non-link status item rendered by the same template.
3. The menubar stays inside the scaled stage, so the header keeps scaling with the table (answers the open point of the design).
4. One `LeaveGame` service wraps `ConfirmationService.confirm` in a promise; single-flight; closes itself if the situation disappears.
5. `canDeactivate` guard asks, calls `socket.leave()`, then lets the navigation continue; the `Game` redirect effect is muted during that leave so it cannot hijack the target.
6. Theme: two modes, initial value from `prefers-color-scheme` once, no live following, `index.html` pre-paint script stays as is.
7. P3 create-game form: only after P1 and P2; scope kept to labels and numeric inputs.
