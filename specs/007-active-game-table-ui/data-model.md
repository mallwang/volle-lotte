# Data Model: Active Game Table UI

No persisted or protocol data changes. View-model types live in `apps/frontend/src/app/core/table-view.ts`.

| Type / function                           | Definition                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `SeatArea`                                | `` `${'l' \| 'r'}${number}` `` grid area: side and row from the top (`l1`, `r1`, `l2`, ...)      |
| `seatAreas(count)`                        | Area list for 1–8 seats: `l1, r1, l2, r2, ...` (own seat first)                                  |
| `SeatView`                                | `{ name, score, computer, online, active, you, area }` per player, in turn order, own seat first |
| `totalCards(rules)`                       | `sum(rules.cardCounts)`                                                                          |
| `playedCards(total, deckSize, hasActive)` | `max(0, total - deckSize - (hasActive ? 1 : 0))`                                                 |
| `PileLevel`                               | `'many' \| 'medium' \| 'few' \| 'empty'`                                                         |
| `pileLevel(deckSize, total)`              | See research.md                                                                                  |
| `discardLayers(played)`                   | `min(8, ceil(played / 6))`                                                                       |
| `layerTransform(i)`                       | `{ rot: ((i*47)%23-11)*1.1, x: (i*31)%9-4, y: (i*17)%7-3 }` deterministic jitter                 |

Rules: all values derive from `GameView`; own seat = `you.seat`; players with `seat < 0` (replaced) are shown by their current seat state as today.
