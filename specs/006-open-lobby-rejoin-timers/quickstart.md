# Quickstart: validating 006

Prerequisites: `npm ci`; then `npm run dev` (frontend + backend). Use two browser profiles (A = host, B = guest). Automated: `npm run test` and `npm run typecheck`.

1. **Open game**: A creates a game with an empty password; B sees it as open and joins with one tap (no password prompt). A creates a protected game: B is asked for a password.
2. **Started game is closed**: A starts; the list shows 🔒 Running and no Join for a third profile C.
3. **Close seat**: before starting, A closes B's seat; B sees the removal modal and "Back to lobby"; B cannot join that game again. A voluntary leave by B (other game) allows joining again.
4. **Leave**: in a running game B presses Leave; the confirm modal states bot, lobby, rejoin; after confirming a bot of random difficulty plays B's seat at once; log shows the replacement.
5. **Rejoin**: B's list shows Rejoin for that game (same browser); pressing it returns B to the same seat with the score kept, bot stops, log message and toast for A.
6. **Disconnect**: close B's tab; after 30 s a bot takes over; no host dialog appears.
7. **Timers**: on A's turn do nothing: draw/throw auto-act after 10 s, select skips the turn after 15 s with no points, secure/continue auto-secures after 15 s; the countdown shows for all players, not on bot turns, and starts after the dice stop.
8. **Timeout strikes**: let three turns expire in a row; a warning shows after the second, a bot replaces A after the third, and A can rejoin. Any own action resets the counter.
9. **Languages**: switch EN/DE and check every new text.
