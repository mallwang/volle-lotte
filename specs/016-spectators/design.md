# Design: Spectators

**Mockup**: [mockup.html](mockup.html) (static, clickable, non-functional, local file). Original Artifact (may go stale): https://claude.ai/artifact/4Cndt8R5XbefbNtZqz7Z9A. Controls: viewport (desktop, mobile), screen (games list, watch with password, spectator table, player table, spectator settings, host settings, spectator game over, spectator switched off), theme button.

## Approved layout

```
Games list (existing cards)
  running game, open or protected : [Watch] (protected asks for the password first)
  running game, spectating off     : no Watch button, only the "Running" tag
  game still in its lobby          : [Join] only, no Watch
Table (existing layout, 64rem; players, log and Leave game unchanged)
  title row : game title [Watching tag, spectators only] ... [eye counter] [settings]
  spectator : banner "You are watching", active player's dice and turn total, no Throw/Bank
  player    : unchanged table plus the counter
Settings dialog
  spectator : "Skip dice animation" only
  host      : existing settings plus switch "Allow spectators" (on by default)
              off -> hint, counter hidden, all spectators sent back to the lobby
Game over (spectator): ranking, only [Back to the lobby], no Rematch
Switched off (spectator): lobby list with a one-time hint, shown to that spectator only
```

- **Watch from the list** (FR-001, FR-012): only for running games; protected games reuse the password dialog.
- **Spectator table** (FR-003, FR-004): same table, scores and log as the players; the action area shows what the active player does, without buttons.
- **Counter** (FR-006, FR-007): in the title row for players and spectators alike, next to the game title; it shows "0" muted while spectating is allowed and is hidden when the host turns spectating off. Joining or leaving changes only this number.
- **Settings** (FR-005, FR-009, FR-010): spectators see only "Skip dice animation"; the host has one switch for all spectators, no list and no names.
- **Game over and switch-off** (FR-011, FR-015): spectators get a message only they see and return to the lobby.

## Requirement traceability

| Region                       | Requirements                         |
| ---------------------------- | ------------------------------------ |
| Games list, Watch, password  | FR-001, FR-002, FR-012, FR-014       |
| Spectator table              | FR-003, FR-004                       |
| Counter in the title row     | FR-006, FR-007                       |
| Settings dialog (spectator)  | FR-005                               |
| Settings dialog (host)       | FR-009, FR-010, FR-014               |
| Game over, switched-off hint | FR-011, FR-015                       |
| Texts                        | FR-017 (German texts follow in plan) |

## Out of scope for this mockup

- German texts, keyboard and focus behaviour, reconnect after a reload (FR-013), timer and cleanup behaviour (FR-008), the protocol change (FR-016); no UI beyond the above.
- The exact counter wording for 1 spectator and the toast-free join/leave behaviour; nothing is shown to mock up.

## Fidelity note

Colours are the real Terracotta tokens in light and dark. Dice are plain squares and icons are emoji; the real app uses the existing dice area, PrimeNG components and PrimeIcons, so spacing and labels may differ in detail.
