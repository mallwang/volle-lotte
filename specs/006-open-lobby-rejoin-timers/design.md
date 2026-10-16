# Design: Open lobbies, rejoin, leave warning and turn timers

**Mockup**: [mockup.html](mockup.html) (static, non-functional, local file; no Artifact link because the Artifact tool was unavailable). States: game list, list with rejoin, game lobby (host), removed modal, timer roll, timer select + warning, leave modal, rejoined; desktop/mobile and light/dark toggles.

## Approved layout

```
Open games                                   [Create game]
┌ Friday round ┐ ┌ Pub night ┐ ┌ Full house ┐ ┌ Lunch break ┐
 🔓 Open 2/4      🔑 Password    🔓 Open 4/4     🔒 Running
 [Join]           [Join]         [Full]          [Rejoin] (only the former player, card highlighted)

Game lobby: seat rows  [n] name [Host|Ready]  [Remove this player]

Table:  turn card
        ⏱ Your turn  ▓▓▓▓░░░░  7 s        countdown bar for the active human, visible to all
        ⚠ warning banner after 2 consecutive timeouts
        dice / action button + hint "Rolls automatically at 0"
                                   Players (🖥 replaced X / ✓ Back, human again) | Log
```

- **Game list** (FR-001..004): cards show open vs. password, seats used, full state; started games show 🔒 Running with no Join.
- **Rejoin** (FR-011): Rejoin button only on the former player's own running game, card highlighted.
- **Game lobby** (FR-005): host-only "Remove this player" on human seats; the seat becomes open. The host's leave button reads "Withdraw game".
- **Removed modal** (FR-006): title, message, single "Back to lobby" button.
- **Timers** (FR-015..018, 018a): bar plus seconds, turns red when low; hint under the action says what happens at 0; no countdown on computer turns. Warning banner (not a modal) after 2 timeouts.
- **Leave modal** (FR-009): three consequences listed, Cancel and "Leave game".
- **Rejoined** (FR-013, 014): seat tag "Back, human again", transient toast "Chris is back", log entries.
- Look follows the Terracotta tokens of [003 design](../003-ui-foundation-primeng/design.md), light and dark; mobile is a single column.

## Requirement traceability

| Requirement       | Region/state                                  |
| ----------------- | --------------------------------------------- |
| FR-001..004       | Game list, list: rejoin                       |
| FR-005..008       | Game lobby (host), removed modal              |
| FR-009, 010, 012  | Leave modal (30 s grace is server-side)       |
| FR-011, 013, 014  | List: rejoin, rejoined (seat tag, toast, log) |
| FR-015..018, 018a | Timer states, warning banner                  |
| FR-019            | Log entries "automatically (timeout)"         |

## Out of scope for the mockup

Server-side enforcement and timing (FR-015..018b, 012), start of the countdown after the dice animation, identity/ban logic (FR-007, 011), bot difficulty choice, disconnect handling, translations (FR-020), the constitution amendment for optional passwords.

## Fidelity

Static HTML/CSS only; no PrimeNG or Angular components. The real UI uses PrimeNG cards, tags, dialog and toast, so details will differ. Buttons must keep ≥44px hit areas.
