# Quickstart: Verifying Finer Socket Diffs and Compact Log

Prerequisites: `npm ci` (npm >= 11). Everything runs through Nx.

## 1. Unit and round-trip tests (SC-004, SC-005, FR-016)

```bash
npx nx test game-rules
```

Expect: `view-sync.spec.ts` replays seeded games with 2 to 8 players and checks `applyChange(prev, diffView(prev, next))` equals `next` for every step; `game-diff.spec.ts` covers draw, throw, select, bank, bust, timeout, seat change (rename, replacement), game end and rematch; `wire-log.spec.ts` checks `decodeLog(encodeLog(x))` equals `x` for every log of those games and that the log kinds and event types do not collide.

## 2. Gateway tests (SC-006, Story 3)

```bash
npx nx test backend
```

Expect: a card draw change has `gameDiff` with no player names or scores; a timeout warning change is `{ n, you: { timeoutWarning }, log }`; a turn change has no `turnDeadline: null` next to `gameDiff.current`; a client announcing protocol 12 gets `versionMismatch` and no push; spectators receive the same differences; a client that skips a change recovers through `game:sync`; the view reached by the changes equals a fresh snapshot.

## 3. Frontend tests (FR-010, FR-011)

```bash
npx nx test frontend
```

Expect: `socket.service.spec.ts` applies snapshots and changes in compact form and ends with the same `GameView` as before; the log text of a full game is identical in English and German (`game-view.spec.ts`).

## 4. Measurement (SC-001 to SC-003, SC-007)

```bash
npm run measure:socket -- --label v13
```

Expect: the same four scenarios as in [socket-traffic.md](../../docs/socket-traffic.md). Check: a card draw in the 4-player round at least 60% smaller than 747 bytes; bytes per player in the 8-player game at most 0.185 MB (half of 0.37 MB); the same for the spectators. The script also prints the key-table estimate for the Story 4 gate (at least 25% saving, otherwise Story 4 is dropped). Copy the figures, the saving per story and the decisions into `docs/socket-traffic.md`.

## 5. Manual check in the browser (optional)

Start `npm run dev`, create a game with computers, open the browser network tool (WebSocket frames) and play a round: a draw frame has no player names; the log of the table reads exactly as before; reload the page and join again: the table and the log look the same as in the other player's window. Then run the old frontend build (protocol 12) against the new server: it shows the reload message.

## 6. Before the pull request

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Then `/speckit-sonar-local`, as for the earlier specs.
