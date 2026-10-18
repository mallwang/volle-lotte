# Research: App Shell Navbar and Leave-Game Confirmation

No NEEDS CLARIFICATION remain. The open points of the spec and design are decided here.

## 1. Menubar and the active page

- **Decision**: `p-menubar` with `[model]` (a computed list of items) and a custom `#item` template per entry: `<a [routerLink] routerLinkActive="vl-menu-active" ariaCurrentWhenActive="page">`. `#start` holds logo, name and version; `#end` holds the language select and the theme button.
- **Rationale**: The default item rendering does not expose the active state or `aria-current` in a way we control; the template does and costs a few lines. `ariaCurrentWhenActive="page"` gives assistive technology the highlight (FR-003). The active look combines fill, underline and weight (no colour-only cue).
- **Alternatives**: Plain `model` with `routerLink` items (no control over the active state); keeping the hand-built `<nav>` (rejected by the request).

## 2. No hamburger at the minimum width

- **Decision**: Set the menubar `breakpoint` so the collapsed (mobile) layout never applies; verify at 695 px in the browser. If the version text crowds the entries it is hidden below a CSS width, as in the mockup.
- **Rationale**: The default breakpoint (960 px) would collapse the bar into a hamburger button in the supported window range 695-960 px, hiding all links.
- **Alternatives**: Accept the hamburger (worse for a 3-entry bar).

## 3. Status entry "Current game"

- **Decision**: A model item without `routerLink`, rendered by the same template as a non-interactive element with `aria-current="page"`, a phase tag ("Lobby", "Running") and the active styling. It exists only while `socket.game()` is set.
- **Rationale**: Leaving always requires the dialog and ends the game, so a link back is never useful (decided in the design review).
- **Risk**: A non-activatable item inside `role="menubar"` may trigger an axe finding. Verify with `expectNoA11yViolations`; if it fails, render the status entry next to the menubar (in `#end`) instead of in the model.

## 4. Menubar position and width

- **Decision**: The menubar replaces `<header class="vl-header">` at the same place, inside `.vl-stage-inner`. The band is full width, its content is limited to 1200 px (`max-width` on an inner wrapper). While a game is running the stage is 992 px wide, so the limit has no effect there and the bar keeps scaling with the table.
- **Rationale**: Keeps spec 008 untouched (FR-017) and answers the open point from the design: no separate treatment in a running game.

## 5. One leave confirmation

- **Decision**: `LeaveGame` (root service):
  - `situation`: computed from `socket.game()`: `null` game, phase `finished`, or a removed player (`you.seat < 0`) give `none`; phase `lobby` gives `lobbyHost` or `lobbyGuest` (via `isHost`); phase `running` gives `running`.
  - `confirm(): Promise<boolean>`: `none` resolves `true` without a dialog; otherwise `ConfirmationService.confirm` with `header`, `message`, `acceptLabel` (the action name), `rejectLabel` ("Stay"), `defaultFocus: 'reject'`, danger styling on the accept button. `accept` resolves `true`; `reject` (including Escape and the close icon) resolves `false`. A second call while one is open returns the same promise (no stacked dialogs).
  - `request()`: for the in-page buttons: `if (await confirm()) socket.leave()`.
  - An `effect` closes the dialog and resolves `true` when `situation` becomes `none` while a dialog is open (game ended, host cancelled, player removed).
- **Rationale**: One implementation for the guard, the table button and the lobby button (FR-011). `p-confirmdialog` provides alertdialog semantics, focus trap and focus return (FR-008, FR-016).
- **Alternatives**: Keep a `p-dialog` per page (the duplication the request removes); a generic dialog service (more than needed).

## 6. Guard and the redirect effect

- **Decision**: `leaveGameGuard: CanDeactivateFn<Game>`: `if (!(await leave.confirm())) return false; if (leave.situation() !== 'none') { ok = await socket.leave(); if (!ok) return false; } return true`. While this runs, `LeaveGame.leaving` is true and the `Game` redirect effect (`if (!socket.game()) navigate('/lobby')`) skips, otherwise it would replace the clicked target with the games page. `leave()` in `SocketService` returns a boolean and reports a rejected request as an error toast, so a failed leave keeps the player where they are (edge case).
- **Rationale**: `canDeactivate` runs for navbar links, browser back/forward and programmatic navigation alike (FR-006). When the in-page button leaves, `socket.game()` becomes `null`, the effect navigates to the games page and the guard finds `situation = none`, so nothing is asked twice.
- **Direct page address**: typing an address in the browser reloads the app; this is not interceptable and out of scope like closing the tab (spec: no `beforeunload`). The existing session resume brings the player back into the game. FR-006 is limited to in-app navigation accordingly.

## 7. Theme

- **Decision**: `ThemeMode = 'light' | 'dark'`. Initial value: stored value if it is `light` or `dark`, otherwise `matchMedia('(prefers-color-scheme: dark)')` evaluated once; no listener for later OS changes and nothing is stored until the player toggles. `toggle()` replaces `next()`. The button is a text `p-button` with `pi pi-sun`/`pi pi-moon` showing the current mode; its accessible name states the current theme and the action (new keys `theme.switchToLight`, `theme.switchToDark`; `theme.system` is removed in en and de). The inline pre-paint script in `index.html` already ignores unknown values and needs no change.
- **Rationale**: Removes the no-op first click (FR-012, FR-013). A stored legacy `system` is simply not a valid value.
- **Alternatives**: `p-toggleswitch` (more space, needs an extra visible label); following live OS changes (contradicts "once").

## 8. Create-game form (P3)

- **Decision**: The form is already a centred column (`.vl-form`, max 36rem, spec 003). Scope for P3 is limited to what the spec asks (label and numeric-input look, validation message) using `p-floatlabel`/`p-inputnumber` where it simplifies the markup; if it needs more than small template changes it is dropped.
- **Rationale**: Lowest priority; must not delay P1/P2.

## 9. Verification

- Unit tests as listed in the plan; axe in light and dark.
- Throw-away Playwright script (skill `verify-ui`): browser back from table and lobby, Escape and focus return, 695 px menubar, 1600 px width (1200 px limit), theme toggle with a dark device preference.
