# Quickstart: Validate Desktop Minimum Size and Table Polish

Prerequisites: `npm install`, `npm run dev`; use the `verify-ui` skill for app URLs and selectors. Contracts: [contracts/ui-contract.md](contracts/ui-contract.md), state: [data-model.md](data-model.md).

## 1. Automated

```bash
npm run lint && npm run typecheck && npm run test
```

Expected: green, including the new `table-scale` unit tests (scale at 1920x950 is 1.0, at 1024x640 about 0.71, mode `blocked` below 0.7).

## 2. Measurement table (SC-001, SC-002)

Throw-away Playwright script, game against computer players, for 2, 4, 8 players, phases draw, throw, select, bust, at 1024x640, 1280x650, 1920x950.
Expected: every play-area element (seats, card and piles, dice, actions, Secured area, "Bank points") ends at or above the viewport bottom; relative positions differ by at most 1% between sizes; no horizontal scroll.

## 3. Scaling, notice, hint (US1, US2, SC-004)

1. Start a game at 1920x950: scale 1.0, no notice.
2. Resize to 1280x650: table scales, notice shown, dice animation and turn timer keep running.
3. Dismiss the notice, resize between 1280 and 1024 wide: notice stays away; reload brings it back.
4. Resize below 695 x 630: blocking hint within 1 s; enlarge again: table back within 1 s, same game state, no reload.
5. Browser zoom 125% / 150% behaves like a smaller window.

## 4. Keyboard and focus (US3, SC-005)

Tab through the running game at 1024x640 and 1920x950, light and dark, EN and DE. Expected: order header, table controls, log; no seat card stops; visible ring everywhere; a full turn (draw, throw, select, set aside, bank) with the keyboard only.

## 5. Contrast and text fit (US4, SC-006)

Repeat the spec 007 walk-through at 1024 px and wider for 2, 4, 8 players in both themes and languages: contrast of body text 8.6:1 or better, no overflow or overlap, longest German Secured-area texts fit at scale 0.7, smallest text still readable (confirms or adjusts `MIN_SCALE`).

## 6. Smoke test (SC-007)

One complete game: lobby, play, bust, bank, reconnect. No regression against v0.0.5.
