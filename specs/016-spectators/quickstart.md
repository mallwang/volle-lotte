# Quickstart: validating Spectators

## Prerequisites

`npm install` (npm >= 11), then `npm run dev` (frontend and backend). Use three browser profiles (host, player, visitor).

## Automated

```bash
npx nx run-many -t typecheck lint test -p game-rules backend frontend
npm run test:e2e   # optional, slow flows
```

Expected: green. New tests cover room state (join, leave, switch-off, no log), gateway intents (password, rejected play intents, reconnect), the spectator view, the lobby Watch button, the spectator table and the settings dialog.

## Manual scenarios (map to the spec)

1. Host creates a game with a computer, starts it. Visitor sees "Watch" in the games list, joins (US1). Table shows scores, active action and log, no play buttons; settings show only "Skip dice animation".
2. Counter reads 1 for host and spectator; join and leave in a loop: no log entry, no toast for the host (US2, SC-004).
3. Protected game: Watch asks for the password; wrong password counts against the rate limit (FR-012).
4. Host turns "Allow spectators" off: visitor returns to the lobby with a message; "Watch" disappears; counter hidden. Turn on again: Watch returns, counter 0 (US3).
5. Let turn timers run with a connected spectator, then close all players: the game ends and cleans up exactly as without spectator (US4).
6. Reload the spectator tab: back in the same game, counter still 1 (US5). Finish the game: spectator sees game-over with only "Back to the lobby".
7. Fill all 8 seats: a further visitor can still watch (US1 scenario 5).
