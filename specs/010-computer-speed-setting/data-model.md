# Data Model: Computer Player Speed Setting

## ComputerSpeed

An integer 1..5 (`1` slow ... `5` fast), default `3`. Owned by the host through `GameRoom`; reset with every new room; never persisted or remembered. Sent to all clients in `GameView.computerSpeed`.

Validation: integer in 1..5, else `invalidRequest`. Changing requires `playerId === hostId` (else `notHost`) and `phase !== 'finished'` (else `notInGame`). Allowed in `lobby` and `running`.

## Pacing

Pure lookup in `libs/game-rules/src/lib/pacing.ts`:

| Field         | Meaning                                                          |
| ------------- | ---------------------------------------------------------------- |
| `pauseMs`     | Wait before a computer acts; time a pick is highlighted          |
| `afterRollMs` | Margin added to the roll maximum after a throw                   |
| `noticeMs`    | Time a turn result stays on the table (server wait, client show) |

`pacing(step)` returns the row for a valid step and the default row for any other input. Step 2 equals today's constants (`COMPUTER_PAUSE_MS` 2000, `AFTER_ROLL_MS` 3250, `NOTICE_MS` 6000). Table: [research.md](research.md) R2.

## GameRoom state (backend)

| Field                         | Type    | Notes                                                                         |
| ----------------------------- | ------- | ----------------------------------------------------------------------------- |
| `fastComputerDice`            | boolean | unchanged                                                                     |
| `computerSpeed`               | number  | new, default `DEFAULT_SPEED`                                                  |
| pending computer timer        | -       | gains `startedAt` and a `delayFor(pacing)` function so a change can re-arm it |
| `computerDelay` / `turnDelay` | number  | now derived from `pacing(computerSpeed)`                                      |

State transitions: `setSettings(playerId, patch)` -> validate -> apply changed fields -> if `computerSpeed` changed, re-arm the pending computer timer -> `emit()` -> return the list of real changes (empty list = nothing to announce).

## SettingChange (announcement)

`{ setting: 'computerSpeed' | 'fastComputerDice'; value: number | boolean }`. Sent with the nickname of the host in `game:settingsChanged`. Not stored.
