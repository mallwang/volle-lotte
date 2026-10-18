# Design: Computer speed slider and setting toast

**Mockup**: [mockup.html](mockup.html) (static, partly clickable, non-functional, local file). Original Artifact (may go stale): https://claude.ai/artifact/HBcdAuub5dz6EhihewG3FT. Controls: screen (lobby host, lobby guest, table settings host, table settings guest, guest sees toast) and a dark canvas toggle. As host, dragging the slider shows one toast after the thumb rests.

## Approved layout

```
Lobby (host and guest)
  seats list
  ┌ Game settings ──────────────────────────────┐
  │ Computer speed                  3 · Medium  │
  │ [────────●────────]  (disabled for guests)  │
  │  1 Slow        3 Default        5 Fast      │
  │ hint / "Only the host can change this."     │
  │ ───────────────────────────────────────────  │
  │ Fast computer dice                    [ ○ ] │
  └─────────────────────────────────────────────┘
  [Withdraw game | Leave game]   [Start] (host)

Table settings dialog (existing, extended)
  Skip dice animation (local)
  Fast computer dice (host only)
  Computer speed slider (host only)

Toast (top right, like turn-result toasts)
  <Host> changed a setting
  Computer speed: 4 (fast)
```

- **Slider** (FR-002, FR-003, FR-004): five steps, a higher value is faster (1 slow, 5 fast). Step 3 is the default and is labelled on the scale. The current step and its name ("3 · Medium") show next to the label, so the value is readable without the thumb. The same control appears in the lobby panel and in the table settings dialog.
- **Guest view** (FR-005): the same control, disabled, with the note "Only the host can change this."
- **Fast computer dice** (FR-008, FR-010): stays a separate switch beside the slider with the same host-only rules.
- **Toast** (FR-009, FR-010, FR-011): names the host, the setting and the new value; one toast per settled change.
- **Lobby panel placement**: between the seats and the buttons, so the host sees it before pressing Start.

## Requirement traceability

| Region                     | Requirements                   |
| -------------------------- | ------------------------------ |
| Slider (lobby, dialog)     | FR-002, FR-003, FR-004, FR-007 |
| Guest view / disabled      | FR-005                         |
| Fast computer dice switch  | FR-008                         |
| Toast                      | FR-009, FR-010, FR-011, FR-012 |
| Labels, keyboard operation | FR-014                         |

## Out of scope for this mockup

- German texts, the real PrimeNG slider look and focus rings, toast animation and auto-hide time.
- The table behind the dialog (stand-in), timings per step, default values (planning), rules for join and rejoin toasts (FR-012).

## Fidelity note

Colours are the real Terracotta tokens in light and dark. The slider, switch, dialog and toast are stand-ins for the PrimeNG components.
