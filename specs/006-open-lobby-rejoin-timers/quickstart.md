# Quickstart: validating 006

Prerequisites: `npm ci`; then `npm run dev` (frontend + backend). Use two browser profiles (A = host, B = guest). Automated: `npm run test` and `npm run typecheck`.

1. **Open game**: A creates a game with an empty password; B sees it as open and joins with one tap (no password prompt). A creates a protected game: B is asked for a password.
2. **Started game is closed**: A starts; the list shows 🔒 Running and no Join for a third profile C.
3. **Remove player**: before starting, A presses "Remove this player" on B's seat; B sees the removal modal and "Back to lobby"; the seat is open again and B's list card shows the red removal notice instead of Join; a third profile can take the seat. A voluntary leave by B (other game) allows joining again.
4. **Leave**: in a running game B presses Leave; the confirm modal states bot, lobby, rejoin; after confirming a bot of random difficulty plays B's seat at once; log shows the replacement.
5. **Rejoin**: B's list shows Rejoin for that game (same browser); pressing it returns B to the same seat with the score kept, bot stops, log message and toast for A.
6. **Disconnect**: close B's tab; after 30 s a bot takes over; no host dialog appears.
7. **Timers**: on A's turn do nothing: draw/throw auto-act after 10 s, select skips the turn after 15 s with no points, secure/continue auto-secures after 20 s; a draw timeout skips the turn (log: "ran out of time" only); the countdown shows for all players, not on bot turns, and starts after the dice stop.
8. **Timeout strikes**: let three turns expire in a row; a warning shows after the second, a bot replaces A after the third, A sees a non-closable modal with "Back to the lobby" (all controls disabled) and A can rejoin. With no human left the bots pause. Any own action resets the counter.
9. **Languages**: switch EN/DE and check every new text.
