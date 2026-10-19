# Quickstart: Validating the Game-Over Modal

## Prerequisites

- `npm install` done (adds `party-js`); Node >= 24, npm >= 11.
- Dev servers: `npm run dev` (frontend and backend).

## Automated checks

```bash
npx nx test backend
npx nx test frontend
npx nx run-many -t lint typecheck build
```

Expected: all pass. New or changed tests:

- Backend `game-room.spec.ts`: leave and lost connection in a finished room keep seat count, order, names and scores; `left` logged once; host re-elected; room closes when the last human leaves; no rejoin.
- Backend `lobby.gateway.spec.ts`: `session:start` for a finished game returns no `game`, clears `gameId`, joins the lobby; a second player's view is unaffected apart from the departed seat.
- Frontend `celebration.spec.ts`: start is idempotent, bursts repeat, stop clears the timer, reduced motion starts nothing, hidden document skips bursts.
- Frontend `game-over.spec.ts` and `table.spec.ts`: modal not shown while running, while dice roll or a notice is shown; shown when finished and everything revealed; winner text for the winner; ranking and tie display; not closable by Escape or backdrop; button leaves; celebration starts only for the winner and stops on hide.
- Frontend `leave-game.spec.ts`: the guard leaves a finished game without a confirmation.
- Frontend `game.spec`/`app.spec`: the table renders for `finished`; no result route component.

## Manual scenarios (use the `verify-ui` skill for a scripted run)

1. **Modal at game end**: start a 2 human game with a low target score (or one human and computers), play to the end. Both players get the modal after the last dice stop; the table with scores is visible behind it; backdrop click and Escape do nothing; the winner sees confetti, the other does not.
2. **Reload**: with the modal open press F5. The games list is shown; creating a game works at once. The other player's modal is still open and the table behind it still shows all names and scores.
3. **Reduced motion**: enable "reduce motion" in the OS or in the browser devtools rendering panel; win a game: no confetti, the "You won!" text is shown.
4. **Navigation**: with the modal open press the browser's back button: you are in the games list, no confirmation.
5. **Small window**: at 695x630 the modal is fully readable and the button reachable.
6. **Languages and themes**: repeat 1 in German and in dark mode; text contrast is fine.
