# Design: Active game table UI (Variante A, desktop)

**Mockup**: [mockup.html](mockup.html) (static, non-functional, local file; no Artifact link because the Artifact tool was unavailable). Toggles: 2/4/8 players, my turn, computer turn, bust, player offline, draw pile many/medium/few/empty, light/dark.

## Approved layout

```
Game · Round 3                                   [⚙] [Leave game]
┌ TableLayout (3x3 grid, oval felt behind) ───────────────┐ ┌ Log ─────┐
│  [seat tl]        [seat t]         [seat tr]            │ │ GameLog  │
│  [seat l]   ▒draw▒  [active card 2:3]  ░discard░  [seat r]│ │ (right,  │
│  [seat bl]   [ME: seat b, highlighted]  [seat br]       │ │ scrolls) │
└──────────────────────────────────────────────────────────┘ └──────────┘
┌ DiceArea ───────────────────────────────┐ ┌ Secured ────────┐
│ hint / bust message                     │ │ Street 3/6      │
│ dice row                                │ │ safe groups     │
│ [Throw] [Bank 350]  (hints below)       │ │ Bank: 350       │
└─────────────────────────────────────────┘ └─────────────────┘
```

- **Seats** (FR-001..005): clockwise from the local player. 8 players = b, bl, l, tl, t, tr, r, br (3 top, 3 bottom incl. own, 1 left, 1 right); 4 = b, l, t, r; 2 = b, t. Own seat lavender with "You" chip, active seat primary border plus timer bar at the bottom edge of the card, offline seat dashed with a "Reconnecting" chip.
- **Centre** (FR-006..010): draw pile (tidy, layered, count label, four levels incl. empty outline), CSS active card 2:3 with value, icon and name, discard pile (untidy, rotation and offset deterministic from the layer index, layers grow with played cards, count label).
- **DiceArea** (FR-011): dice (existing pip grid and rolling animation), actions with their hint lines, bust message, computer/offline hints; "Secured" panel with Street and safe groups.
- **GameLog** (FR-011): right column, scrolls; the old player list and text lines for deck and active player are gone (FR-012).
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
