# Design: Dice pips, rolling animation and settings

**Mockup**: [mockup.html](mockup.html) (static, non-functional, local file; no Artifact link because the Artifact tool was unavailable). States: select, rolling, reduced motion, computer turn, settings (host), settings (guest); desktop/mobile and light/dark toggles.

## Approved layout

```
Game name                                        [⚙]   title row, game-scoped (not in the app bar)
[card]
 ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐                               table dice, 34px (30px mobile), 3×3 pip grid
 └─┘ └─┘ └─┘ └─┘ └─┘ └─┘
[Throw] [Select] [Bank] [Draw]
                                   Players | Log (newest first, small pip dice centered in the text line)
```

- **Pip dice** (FR-001, FR-002, FR-004): standard 1–6 patterns (1 = centre pip); blank placeholder keeps the size. Log dice are `1.3em`, vertically centred with the text, replacing the framed digits.
- **Selection cue** (FR-019, FR-020): selected die is lifted (`translateY(-5px)`), gets a 3px primary border and a drop shadow; no checkmark. Computer picks use the same cue plus a 🖥 lavender badge, so colour is never the only signal.
- **Rolling** (FR-005..FR-009, FR-011): thrown dice are 3D cubes tumbling at constant speed (linear, no easing); each stops flat on its own face. Set-aside dice stay put. Overlay text "Dice are rolling… 2 of 6 stopped".
- **Reduced motion** (FR-012): dimmed, static dice plus a static "Dice are rolling…" text bar next to the dice (not covering them); announced via a live region; gone after the last die stops.
- **Computer turn** (FR-013, FR-019): dice stop, 3 s pause, picks highlighted, 2 s pause after each action.
- **Settings** (FR-015..FR-018): ⚙ at the right of the game-name row opens a dialog.
  - Host: "Skip dice animation" (this device only) and "Fast computer dice" (host-only tag, game-wide, 1–2.5 s per computer die).
  - Guest: "Skip dice animation"; "Fast computer dice" shown read-only with its current value.
  - Note: computer pauses (3 s / 2 s) are fixed.
- **Mobile**: same single column; die 30px; settings button stays in the title row.
- Look follows the Terracotta tokens of [003 design](../003-ui-foundation-primeng/design.md), light and dark.

## Requirement traceability

| Requirement      | Region/state                              |
| ---------------- | ----------------------------------------- |
| FR-001, 002, 004 | Table dice, log dice                      |
| FR-003           | Accessible labels (not visible in mockup) |
| FR-005..009, 011 | Rolling state                             |
| FR-012           | Reduced-motion state                      |
| FR-013, 019      | Computer state                            |
| FR-015..018      | Settings dialog (host/guest)              |
| FR-020           | Select state                              |

## Out of scope for the mockup

Server-side timing and values (FR-006, FR-007 randomness, FR-010 log/notification delay, FR-011 sync, FR-014 reconnect), persistence of the local setting (FR-017), translated wording (FR-003), real cube/pip rendering details and timing.

## Fidelity

Static HTML/CSS only; no PrimeNG or Angular components. Pips and cube are indicative. The mockup die (34px/30px) is below the real 44px touch-target minimum: the plan must keep the button hit area ≥44px (e.g. padding around the visual die).
