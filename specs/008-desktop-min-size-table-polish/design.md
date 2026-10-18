# Design: Desktop minimum size and table scaling

**Mockup**: [mockup.html](mockup.html) (static, non-functional, local file). Original Artifact (may go stale): https://claude.ai/artifact/Fnnf2FueTKHbL6myKPQrmW. Controls: window size (presets and sliders), 2/4/8 players, phase (select, secured + bank, bust), light/dark, "show notice again".

## Approved layout

The table is not redesigned; it keeps the shipped layout of spec 007 (see [design](../007-active-game-table-ui/design.md)) and is shown as one block of a fixed reference size that is scaled uniformly.

```
Reference stage 992 x 900 px (header 0-68, game row ~100, board 68-900)
┌ header: logo, version ........................ language, theme ┐
│ m8                      Round, points, min. points, Volle Lotte │
│ [me l1]        ╭──────── oval ────────╮              [r1]     │
│ [l2]           │ draw  [card]  discard │               [r2]     │
│ [l3]           │ dice (6 x 60 px)      │               [r3]     │
│ [l4]           │ [Set aside selected]  │               [r4]     │
│ [Log]          │ Secured: dice, +points, [Bank points]         │
└─────────────────────────────────────────────────────────────────┘
scale = min(1, viewport width / 992, viewport height / 900); stage centred
```

- **Scaling** (FR-001, FR-003): the whole stage (header, seats, oval, cards, piles, dice, actions, Secured area) is scaled with one factor, so relative positions never change. At 1024x640 and 1280x650 the factor is about 0.71-0.72, at 1920x950 it is 1.0 (never enlarged). Seat columns stay at x=8 and x=832, rows are 144/318/492/666 px for 8 players (144/492 for 4, 144 for 2).
- **Scaling notice** (FR-005): a small pill in the empty header band, not scaled, reads "Table scaled to fit your window (71%)." with a dismiss button; it never covers the play area. Shown while 0.7 <= scale < 1 and not dismissed.
- **Blocking hint** (FR-006): replaces the table below scale 0.7. Title "Window too small", text with the required size (695 x 630 px) and the current window size, and the line "The game keeps running in the meantime."
- **Readout in the mockup** (review aid only): window, scale, resulting text and button sizes (16 px -> 11.4 px, 12 px -> 8.5 px, 44 px -> 31 px at 0.71).

## Requirement traceability

| Region                       | Requirements                           |
| ---------------------------- | -------------------------------------- |
| Scaled stage                 | FR-001, FR-002, FR-003, FR-004, FR-013 |
| Seats, piles, dice, Secured  | FR-003 (visible without scrolling)     |
| Scaling notice               | FR-005                                 |
| Blocking hint                | FR-006, FR-007                         |
| Focus, tab order (not shown) | FR-008, FR-009, FR-010                 |
| Contrast, text fit           | FR-011, FR-012                         |

## Out of scope for this mockup

- Focus rings, tab order, keyboard operation, contrast measurements (verified on the real app, not drawable in a static mockup).
- The game log (only its button is drawn), settings and leave dialogs, dice animation, bust timer.
- German strings of the notice and the hint.

## Open points carried into planning

- Minimum width: the scale rule alone gives 695 px as the cut-off width, so a portrait tablet (768x1024, scale 0.77) still shows the table. A separate minimum width such as 1024 px would keep portrait tablets out. Recorded in the spec assumptions.
- Header: the mockup scales it with the table. It could instead stay at normal size and leave the table the remaining height. The plan decides.
- Readability at 0.7: the smallest text becomes about 8 px and buttons about 31 px; confirm during implementation.

## Fidelity note

Positions and sizes follow the measured v0.0.5 layout; colours use the real Terracotta tokens in light and dark. Icons, dice and the flag are stand-ins. Because the scaling is a pure uniform transform in the mockup, it matches what the implementation must do; text and focus rings scale with it.
