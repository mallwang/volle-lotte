# Design: Remembered settings and presets

**Mockup**: [mockup.html](mockup.html) (static, clickable, non-functional, local file). Original Artifact (may go stale): https://claude.ai/artifact/3p2fPnfApVCQi3f28rqnxN. Controls: viewport (desktop, mobile), 11 screens (create prefilled, load, delete, save, overwrite, limit reached, storage blocked, lobby prefilled, lobby load, lobby not all fit, start question), theme button.

## Approved layout

```
Create-game page (existing form, 44rem)
  title
  preset bar: "Prefilled from your last game" + hint | [Load preset] [Save as preset] [Reset to defaults]
  name, password | seats | rules (open, marked "changed from the defaults")
  info line: which computers and speed the lobby will get
  [Cancel] [Create game]
Game lobby (host only controls)
  title + settings summary
  preset bar: "In the lobby a preset sets computers and speed only." | [Load preset] [Save as preset]
  message: "added from your last game" or "N added, M did not fit"
  seat list, speed slider, [Cancel game] [Start game]
Start question (lobby, host, on "Start game" when the setup is not known to be saved)
  "Save this setup as a preset?" + summary | [Back to lobby] [No, start the game] [Save as preset]
Dialogs (one list, shared by both pages)
  Load preset / Apply: name, summary, Load|Apply, delete (inline "Delete? / Keep"), "3 of 10 presets"
  Save as preset: name (30 chars), overwrite warning with [Replace preset], limit warning with disabled Save
```

- One shared preset list for both pages (FR-006). Saving in the lobby stores the room's complete setup (FR-007); loading there applies computers and speed only (FR-009, FR-010).
- **Create page** (FR-001 to FR-005, FR-014): prefilled values, "Reset to defaults" in the preset bar, no name or password in presets (FR-005).
- **Dialogs** (FR-008, FR-011, FR-012, FR-013): delete with inline confirmation, overwrite confirmation, limit message, no rename.
- **Storage blocked** (FR-017): notice in the bar, both preset buttons disabled, form works with defaults.
- **Start question** (FR-022 to FR-027): "Save as preset" leads to the normal save dialog and then starts; "No, start the game" starts as usual; "Back to lobby" cancels the start.
- **Lobby** (FR-010, FR-019): preset bar for the host only; message names how many computers did not fit.

## Requirement traceability

| Region                          | Requirements                      |
| ------------------------------- | --------------------------------- |
| Preset bar (create page, lobby) | FR-006, FR-008, FR-014, FR-019    |
| Prefilled form and info line    | FR-001 to FR-005                  |
| Load / apply dialog             | FR-008 to FR-011                  |
| Save dialog                     | FR-006, FR-007, FR-012, FR-013    |
| Storage blocked notice          | FR-016, FR-017                    |
| Lobby message "did not fit"     | FR-010                            |
| Texts                           | FR-020 (German texts in the plan) |

## Out of scope for this mockup

- German texts, keyboard and focus behaviour (FR-018 details), toasts, the nickname page (only a prefilled field, unchanged look).
- Damaged-data fallback (FR-016) and multi-tab behaviour; no visible UI.
- Remembering and storage mechanics (FR-002, FR-015).

## Fidelity note

Colours are the real Terracotta tokens in light and dark. The real app uses PrimeNG dialog, buttons, tags and select; spacing and labels may differ in detail.
