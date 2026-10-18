# Quickstart: Validate Computer Player Speed Setting

Prerequisites: `npm install`, `npm run dev`; use the `verify-ui` skill for app URLs and selectors. Contract: [contracts/protocol.md](contracts/protocol.md), state: [data-model.md](data-model.md), timing table: [research.md](research.md) R2.

## 1. Automated

```bash
npm run lint && npm run typecheck && npm run test
```

Expected: green, including `pacing.spec` (monotonic columns, step 2 equals the old constants, SC-001 and SC-002 model), `game-room.spec` (host only, validation, reschedule, unchanged turn limits), gateway spec (payload validation, one `game:settingsChanged` per change, none on no-op), `socket.service.spec` (toast), `host-settings` spec (debounce, guest disabled, axe in both themes).

## 2. Lobby (US2)

1. Create a game as host with two computers; the lobby shows "Game settings" with the slider at 3 "Medium".
2. A second browser joins: the slider is disabled with "Only the host can change this." and shows the same value.
3. Host moves the slider to 5: both players see one toast "... set the computer speed to 5 (Very fast)". Start: computers act at the fast pace from turn one.

## 3. Running game (US1, US2)

1. Open Settings at the table: host sees the slider and the "Fast computer dice" switch, the guest sees both disabled.
2. Host drags the slider across several steps in one gesture: exactly one toast with the final value for every human.
3. Move from 1 to 5 while a computer is waiting: the wait shortens at once; no step is skipped or doubled.
4. Toggle "Fast computer dice": toast for everyone; the dice roll time changes, the speed does not.
5. Rejoin or join late: no toast for earlier changes; the slider shows the current value.
6. Finish the game, create a new one: the slider is at 3 again.

## 4. Fairness (FR-013)

At step 5 let a computer throw before a human's turn: the human's turn timer bar starts only after the notice and the dice have stopped; with 3 computers the pause between the human's turns is visibly shorter than on `main`.
