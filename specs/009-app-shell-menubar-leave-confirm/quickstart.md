# Quickstart: Validate App Shell Navbar and Leave Confirmation

Prerequisites: `npm install`, `npm run dev`; use the `verify-ui` skill for app URLs and selectors. Contracts: [contracts/ui-contract.md](contracts/ui-contract.md), state: [data-model.md](data-model.md).

## 1. Automated

```bash
npm run lint && npm run typecheck && npm run test
```

Expected: green, including the new `leave-game` (situation, single-flight, close on situation change), guard and `ThemeService` tests, and the axe checks of `App` in both themes.

## 2. Navbar (US1, SC-001)

1. Sign in, open Games, Create game: the open entry is the only highlighted one, in light and dark.
2. Create a game: the lobby shows the links and a "Current game [Lobby]" status entry; start it: tag "Running".
3. Reload on the nickname page without session: page links disabled, language and theme work.
4. Resize to 695 px: no hamburger, all entries reachable. Resize to 1600 px: menubar and pages stay within 1200 px, the table keeps its size.

## 3. Leave dialog (US2, SC-002, SC-003)

For a running game, a host lobby and a guest lobby (two browser contexts):

1. Click "Games": the dialog with the situation's text opens; "Stay" (and Escape) keep everything, focus returns to the link.
2. Click the link again and confirm: the player leaves and lands on Games once (no flicker through another page).
3. Browser back: same dialog; staying keeps the game page.
4. Use the in-page "Leave game"/"Withdraw" button: same dialog look and texts.
5. Finish a game: the result page links leave without a dialog.
6. Host cancels or removes you while your dialog is open: the dialog closes, no second question.

## 4. Theme (US3, SC-004, SC-005)

1. Clear `vl-theme`, device preference dark: app opens dark; one click light, next dark; reload keeps the choice.
2. Set `vl-theme` to `system` manually: app follows the device preference, no error.
3. Search the UI (en, de) and `docs/user-guide.md` for "system theme": no hits.

## 5. Create-game form (US4, only if done)

Create a game with every option changed; compare the settings in the lobby with the input; trigger a validation error.

## 6. Unchanged areas (SC-007)

Scale notice and "window too small" hint, table, dice, log and open-games list behave as in v0.0.5; their existing tests pass unchanged.
