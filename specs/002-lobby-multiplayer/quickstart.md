# Quickstart: validating lobby and multiplayer

Prerequisites: Node >= 22, npm >= 11, `npm install` done.

## Automated checks

```bash
npm run typecheck
npm run test          # game-rules strategy, backend units, socket integration flows
npm run lint
```

Expected: green. The backend integration tests (`lobby.gateway.spec.ts`) start the app on a random port and cover:

1. Create with password, join with wrong then right password (attempts left, lock after 5 failures, no password or token in captured log output) - US1, SC-006.
2. Seats: padlock beyond the count, lock/enable, human to computer, ready, start gating - US2.
3. Full game with 2 and with 8 simulated clients (computers included) to a ranking, state identical for all clients - US3, SC-005.
4. Out-of-turn and illegal actions return a reason and leave state unchanged - SC-003.
5. Disconnect, reconnect inside 60 s (fake timers), expiry then host decision (computer and free), host handover - US4, SC-004.
6. Second connection with the same token replaces the first - FR-023.
7. Cleanup after 15 min (lobby) and 24 h (running) - spec edge cases.
8. Two games in parallel stay independent - SC-007.

## Manual run

```bash
npm run dev
```

1. Open the app in two browser windows (one private), enter different nicknames.
2. Window A: create a game "Test" with password and 3 seats; window B: join with a wrong password (see attempts left), then the right one.
3. A: set seat 3 to computer (medium); B: press Ready; A: Start.
4. Play a few turns; confirm the computer plays on its own with short pauses and B only sees the score table and log, no deck.
5. Close window B, watch the 60 s banner in A, reopen B within 60 s (same browser profile keeps the token) and confirm the seat is back; repeat but wait out the grace period and put in a computer.

Expected: matches the acceptance scenarios in [spec.md](spec.md); wire details in [contracts/socket-protocol.md](contracts/socket-protocol.md).
