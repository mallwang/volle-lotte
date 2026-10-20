# Quickstart: verifying Leaner Socket Messages

Prerequisites: `npm install`, npm >= 11, Node as per `package.json`.

## 1. Baseline (before the change)

Run once on the unchanged protocol and keep the output:

```bash
npm run measure:socket -- --label baseline
```

Expected: a table per scenario (2 players, 8 players, each with and without 2 spectators) with count, total, average and maximum bytes per event and role, the series of message sizes over the game, and `socket-traffic.baseline.json`. The size of `game:state` grows with the game.

## 2. Unit and integration tests

```bash
npm run test -- --projects=game-rules,backend,frontend
npm run typecheck
npm run lint
```

Expected coverage of the new behaviour:

- `view-sync.spec.ts`: `applyChange(prev, diffView(prev, next))` equals `next` for lobby, running, paused, finished and waiting views; log append and cap; structural cases return a snapshot.
- Backend integration: rejoin, reconnect, spectator start, rematch (everybody gets `game:snapshot`) and waiting player; a turn message has no log beyond the new entries and no seat names; `game:sync` answers and is rate-limited.
- Frontend `SocketService`: gap (snapshot 50, change 60) triggers one `game:sync`; duplicate change ignored; changes ignored while syncing; view equals the undisturbed view afterwards.

## 3. Result measurement (after the change)

```bash
npm run measure:socket -- --label after
```

Expected (spec SC-001 to SC-003): late turn messages within 10% of early ones; bytes per player over an 8-player game at least 70% below the baseline; spectators reduced at least as much. Copy both tables into `docs/socket-traffic.md`.

## 4. Manual check (optional, `run` / `verify-ui` skills)

1. `npm run dev`, open a game with three browser windows (two players, one spectator).
2. Play a few turns; compare table, scores and log across windows.
3. Reload one window mid-game: complete log and names appear at once.
4. In the browser dev tools, throttle one tab offline for a few turns, then back online: it shows the same table as the others.
5. Finish the game and start a rematch: all windows, including the spectator, show the new game.

## 5. Decisions to record

In `docs/socket-traffic.md` and in `docs/roadmap.md` (R24): result figures and, for compression, binary encoding and generic diffs, one of: dropped, postponed, planned separately, with the reason.
