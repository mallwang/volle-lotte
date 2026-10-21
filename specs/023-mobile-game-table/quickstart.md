# Quickstart: validating the mobile game table

## Prerequisites

`npm install`, then `npm run dev` (backend + frontend + mobile at `/m/`). Use Chrome devtools device mode (landscape) or a real phone on the LAN.

## Automated

```bash
npx nx run-many -t lint typecheck test -p mobile client-core frontend
npx nx build mobile --configuration=production   # checks the component style budgets
```

Desktop specs must pass unchanged after the helper extraction.

## Manual scenarios

1. **Mixed game (US1, US2)**: host on desktop, add one phone player and two computers, start. Play draw, throw, select, throw again and bank on the phone; the desktop shows the live selection.
2. **Seat counts (FR-008)**: repeat with 2, 4 and 8 seats; scores and the active marker stay visible, long names are ellipsized.
3. **Rotation (US3)**: rotate to portrait mid-turn: blocker with Leave; rotate back: same selection and state.
4. **Viewports (FR-014, FR-016)**: 568×320, 667×375, 932×430 and a notch device: no scroll, no zoom, dice 46-56 px, buttons ≥ 48 px.
5. **Double tap (FR-013)**: double-tap Throw: only one throw happens.
6. **Timer and seats (FR-010)**: let a deadline run; disconnect another phone (offline marker); let a computer replace a player (marker, former name in the title).
7. **Leave and game over (US4)**: leave mid-game (confirm, seat becomes computer); finish a game (ranking, confetti, Leave).
8. **Entry (US5)**: reload on `table/:id`, and enter a running game from the list.
9. **Languages, themes, reduced motion (FR-015, FR-022)**: switch en/de, light/dark, enable reduced motion (no dice animation, no confetti).
10. **Traffic**: `npm run measure:socket -- --label m2` shows no change against desktop.
