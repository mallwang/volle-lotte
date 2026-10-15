# Data Model: UI Foundation

UI-level models only. No server, wire-protocol or persistence change (FR-018). Server types (`GameView`, `SeatView`,
`LogEntry`, `Action`) come from `game-rules` unchanged.

## ThemeMode (persisted)

| Field      | Type                            | Notes                                                     |
| ---------- | ------------------------------- | --------------------------------------------------------- |
| `mode`     | `'system' \| 'light' \| 'dark'` | Default `system`; stored in `localStorage` key `vl-theme` |
| `resolved` | `'light' \| 'dark'` (derived)   | `system` follows `prefers-color-scheme`; none = `light`   |

Effect: `resolved === 'dark'` toggles class `app-dark` on `<html>`. Invalid stored values fall back to `system`.

## PlayerTile (derived, per player)

Built from `GameView` (`game.players[i]`, `seats[playerSeats(g)[i]]`).

| Field       | Source                       | Rule                                 |
| ----------- | ---------------------------- | ------------------------------------ |
| `name`      | `players[i].name`            | Truncated visibly (ellipsis + title) |
| `score`     | `players[i].score`           |                                      |
| `role`      | seat `state` + `hostId`      | `host`, `human`, `computer`          |
| `online`    | seat `connected`             | Shown as text/icon, not colour only  |
| `active`    | `game.current === i`         | Marked with icon + `aria-current`    |
| `reconnect` | `pending` entry for the seat | Countdown until grace period ends    |

## SeatTile (derived, game lobby)

States: `empty`, `human`, `computer`, `locked`, `ready`, `offline`, plus `host` flag. Each state has a label and an icon
in addition to its colour. Host-only actions (lock, add computer, kick, start) are rendered only when `isHost(view)`.

## DiceTile / CardTile (replaceable placeholders, FR-017)

| Component  | Inputs                                           | Outputs   |
| ---------- | ------------------------------------------------ | --------- |
| `DiceTile` | `value: 1..6`, `selected: boolean`, `disabled`   | `toggled` |
| `CardTile` | `card: string \| null` (card id from `GameView`) | none      |

The later dice UI swaps the template of these two components only; the table and turn flow keep the same contract.

## TurnActions (derived availability)

Reuses the existing predicates in `table.ts` (`can('draw')`, `canThrow()`, `canBank()`, select). Addition: each disabled
action exposes a short reason string (for example "Not your turn", "Select at least one die", "Banking needs 350
points"), shown as helper text and `aria-describedby`.

## Notification

| Field      | Type                          | Notes                                   |
| ---------- | ----------------------------- | --------------------------------------- |
| `severity` | `'info' \| 'warn' \| 'error'` | Maps to PrimeNG toast severity          |
| `summary`  | string                        | Readable English, from `errorMessage()` |

Replaces `SocketService.notice` string signal rendering in the header; queue and auto-dismiss handled by PrimeNG
`MessageService` (errors stay until dismissed, info 4 s).
