# Data Model: M2 Mobile Game Table

No persisted or protocol data is added. All entities are client-side views over the existing `GameView` (`libs/game-rules/src/lib/protocol.ts`).

## Table view (read-only, from server)

Source: `MobileSocketService.game()` (`GameView`).

| Field                  | Use                                                                 |
| ---------------------- | ------------------------------------------------------------------- |
| `game.players[]`       | name, score, computer flag, gone flag, connected flag               |
| `game.current`         | active seat index (highlight, own-turn detection)                   |
| `game.turn`            | step (draw, throw, select, decide), dice, locked, turn points, card |
| `game.result`          | ranking and reason for the game-over dialog                         |
| `turnDeadline`         | `{ at, phase }` for the timer                                       |
| `preview`              | dice the active player has marked, shown to others                  |
| `seats[]` (`SeatView`) | `connected`, `former` for offline and replaced markers              |
| `log`                  | street/aside text for the status line                               |

## Player seat (derived)

`seatViews(view)` returns per seat: `index`, `name` (≤ 20 chars; computers show the animal name only), `score`, `active`, `computer`, `replaced`, `offline`, `gone`, `mine`. Rules: exactly one active seat while running; 2-8 rows.

## Local table state (client only, in memory)

| State       | Type                | Rules                                                                                             |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| `chosen`    | `number[]` (dice)   | Cleared on every new turn step or throw. Sent as `turn:preview` while my turn. Survives rotation. |
| `pending`   | `boolean`           | True from sending an action until ack or next view change; disables all action buttons (FR-013).  |
| `notice`    | text + kind or null | Bust, Volle Lotte, Street; held for `pacing(...).noticeMs`, then cleared.                         |
| `rolling`   | dice display state  | Animated reveal of server dice; skipped with reduced motion.                                      |
| `leaveOpen` | `boolean`           | Leave confirmation dialog.                                                                        |
| `now`       | `number` (ms)       | Ticks while `turnDeadline` exists; drives the timer bar.                                          |

## Actions (derived)

`actions` computed from `game.turn` and "is my turn": for each of draw, throw, select (confirm), bank → `{ enabled, reason }`. A disabled action always has a reason text (not color only). Transitions follow the turn step: draw → throw → select → decide (throw or bank) → next player or bust.

## Orientation state

CSS only (`orientation: portrait`); no TypeScript state. Portrait shows the blocker with Leave, landscape the table.
