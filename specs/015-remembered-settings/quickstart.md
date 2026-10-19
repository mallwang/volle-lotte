# Quickstart: Validating Remembered Settings and Presets

## Prerequisites

- `npm install`; `npm run dev` starts frontend and backend (see CLAUDE.md for ports).
- Use a fresh browser profile or clear site data to start without remembered data.

## Automated checks

```bash
npm run typecheck
npm run lint
npm run test      # setup.spec, setup-store.spec, setup-apply.spec, preset dialogs, create-game, game-lobby
npm run build
```

## Manual scenarios (browser, once with the verify-ui skill)

1. **First visit**: create-game page shows defaults and no pending computers; lobby has no computers (SC-006).
2. **Last setup**: create a game with 6 seats, target 4000 and two computers of different skill and risk, set speed 4, start it. Create a new game: 6 seats and 4000 are prefilled, the info line lists the computers, the lobby shows both computers and speed 4 (Story 1, FR-002, FR-003).
3. **Nickname**: reload; the nickname page shows the last nickname (FR-001).
4. **Preset**: save "Friday" on the create page, change values, load "Friday": all values return at once; delete it (Story 2, FR-008, FR-011).
5. **Names and limits**: save the same name again (overwrite asked), a 31-character name (rejected), the 11th preset (limit message) (FR-012, FR-013).
6. **Lobby preset**: seat one human, apply a preset with more computers than free seats: message names how many did not fit, the human stays (FR-010).
7. **Start question**: change one computer and press Start: the question appears; "No, start the game" starts; start the same setup again after a rematch: no question (Story 4, FR-022 to FR-026).
8. **Reset**: press "Reset to defaults": defaults, no pending computers, presets remain (Story 3).
9. **Damaged and blocked storage**: set `vl-presets` to `garbage` and `vl-last-setup` to a setup with `"seats": 99`; pages open with defaults and valid parts. Block site data: notice appears, preset buttons disabled (FR-016, FR-017).
10. **Privacy**: after all steps, no storage entry contains the game name or password (SC-003).
