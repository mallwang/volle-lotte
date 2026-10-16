# Component Contracts

UI contracts for standalone components (signal inputs / outputs). All presentational; `Table` owns state.

| Component     | Inputs                                                                                                              | Outputs                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `PlayerSeat`  | `name`, `score`, `computer`, `online`, `active`, `you`, `deadlineAt?` (timer shown only when set)                   | none                                     |
| `TableLayout` | `areas` (list of `SeatArea`, clockwise from own seat); slots: seats, centre                                         | none                                     |
| `GameCard`    | `card: CardType \| null`                                                                                            | none                                     |
| `CardDeck`    | `size`, `total`                                                                                                     | none                                     |
| `DiscardPile` | `played`                                                                                                            | none                                     |
| `DiceArea`    | `dice`, `selected`, `rolling`, `bust`, `canSelect`, `computerPick`, actions, secured data (street, groups, carried) | `toggled(index)`, action `run` callbacks |
| `GameLog`     | `entries`, `text` function or pre-split parts                                                                       | none                                     |

Accessibility: each component keeps the existing `aria-label`s and live regions (`role="log"`, `role="status"`); seats form an ordered list.
