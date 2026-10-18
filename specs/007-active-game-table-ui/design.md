# Design: Active game table UI (Variante A, desktop)

**Mockup**: [mockup.html](mockup.html) (static, non-functional, local file; no Artifact link because the Artifact tool was unavailable). Toggles: 2/4/8 players, my turn, computer turn, bust, player offline, draw pile many/medium/few/empty, light/dark.

## Approved layout

> Updated after the implementation: the shipped layout (seats in two side columns, own seat top left) replaced the original oval arrangement (own seat bottom centre) and is the target layout for desktop. `mockup.html` still shows the original arrangement and is kept only as a look reference (colours, seat, piles, card).

```
Game · Round 3                                   [⚙] [Leave game]
┌ TableLayout (3 columns, up to 4 rows, oval felt behind) ┐ ┌ Log ─────┐
│ [ME  l1]                                        [r1]    │ │ GameLog  │
│ [l2]      ▒draw▒  [active card 2:3]  ░discard░    [r2]  │ │          │
│ [l3]            dice, actions, hints              [r3]  │ │          │
│ [l4]            [Secured: Street, safe groups]    [r4]  │ │          │
└─────────────────────────────────────────────────────────┘ └──────────┘
```

- **Seats** (FR-001..005): two side columns around the felt, in turn order starting with the local player: l1 (own, top left), r1, l2, r2, ... down to l4/r4 for 8 players; 2 players = l1, r1; 4 = l1, r1, l2, r2. Own seat lavender with "You" chip, active seat primary border plus timer bar at the bottom edge of the card, offline seat dashed with a "Reconnecting" chip.
- **Centre** (FR-006..010): draw pile (tidy, layered, count label, four levels incl. empty outline), CSS active card 2:3 with value, icon and name, discard pile (untidy, rotation and offset deterministic from the layer index, layers grow with played cards, count label).
- **DiceArea** (FR-011): dice (existing pip grid and rolling animation), actions with their hint lines, bust message, computer/offline hints; "Secured" panel with Street and safe groups.
- **GameLog** (FR-011): scrolls; the old player list and text lines for deck and active player are gone (FR-012).
- Look follows the Terracotta tokens of [003 design](../003-ui-foundation-primeng/design.md), light and dark.

## Requirement traceability

| Region                   | Requirements                                      |
| ------------------------ | ------------------------------------------------- |
| PlayerSeat + TableLayout | FR-001..005, FR-012, SC-001, SC-002, SC-004       |
| Active card              | FR-006, FR-007, SC-006                            |
| CardDeck                 | FR-008, SC-003                                    |
| DiscardPile              | FR-009, FR-010                                    |
| DiceArea, GameLog        | FR-011, SC-005                                    |
| All                      | FR-013 (a11y), FR-014 (components), FR-015 (i18n) |

## Out of scope for this mockup

- Mobile Variante B (later spec); breakpoints below 1024 px are not designed here.
- Settings, leave and removed dialogs, dice rolling animation, real timer countdown (all unchanged behaviour).
- German strings, card icons per card type (mockup uses a star stand-in).

## Fidelity note

Colours, chips, spacing and touch targets reuse the real tokens. Buttons and icons in the mockup are plain HTML/emoji stand-ins for PrimeNG and PrimeIcons. Sizes are rem-based and meant to carry over; the oval is a styled element behind the grid. Expect small differences in button and icon rendering only.
