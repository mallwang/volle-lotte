# Data Model: Dice Pips and Rolling Animation

Presentation-only feature; game state and rules entities are unchanged.

## Server (`GameRoom` / `GameView`)

| Field              | Type     | Notes                                                                      |
| ------------------ | -------- | -------------------------------------------------------------------------- |
| `fastComputerDice` | boolean  | default `false`; host-editable; new in `GameView` (protocol v2)            |
| `preview`          | number[] | existing; now also set for a computer pick for 2 s before `select` applies |

## Client (not persisted on the server)

| Entity            | Fields                                                         | Rules                                                                                                 |
| ----------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `DicePrefs`       | `skip: boolean` (localStorage `vl-skip-dice`, default `false`) | Never sent to the server.                                                                             |
| `RollPlan`        | `durations: number[]` (ms, one per thrown die)                 | 2000–5000 per die; 1000–2500 if thrower is a computer and `fastComputerDice`; all 0 when `skip`.      |
| `DiceRollService` | `rolling: boolean`, `stopped: boolean[]`, `stoppedCount`       | Starts only on a new `thrown` entry after load; ends when all dice stopped; next roll never overlaps. |
| Die (view)        | `value: number \| null`, `selected`, `rolling`, `computerPick` | Final `value` always equals the server value; `rolling` only affects what face is drawn.              |

## State transitions

`idle → rolling` (new `thrown` log entry, skip off) `→ idle` (last die stopped; log cursor and toasts flushed). Reload/reconnect: `idle` with final values.
