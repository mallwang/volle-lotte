# Design: App shell menubar and leave confirmation

**Mockup**: [mockup.html](mockup.html) (static, clickable, non-functional, local file). Original Artifact (may go stale): https://claude.ai/artifact/QkL852tNJ2WacCV6tie8hN. Controls: window (reference 992, minimum 695, wide 1600), page (nickname, games, create game, lobby host and guest, running game, result), theme button. Clicking menubar entries inside a lobby or a running game opens the leave dialog.

## Approved layout

```
Menubar (full-width band, content max 1200 px, centred)
┌ [VL] Volle Lotte v0.0.5 | Games | Create game | Current game [Running] ......... [DE ▾] [☀] ┐
Page content (max 1200 px, centred)
  nickname / create game : one narrow column (28rem), centred
  lobby / result         : centred column (48rem)
  games list             : stand-in, reworked later
  running game           : table keeps its 992 px stage and scale rules (never enlarged)
Leave dialog (modal, over the page)
  title, text per situation, [Stay] [Leave|Cancel game|Leave lobby]
```

- **Menubar** (FR-001, FR-002): brand at the start, page links in the middle, language select and theme button at the end. The open page is highlighted by fill, underline and weight, and carries the current-page state for assistive technology (FR-003).
- **Current game** (FR-004): a status entry that only exists while the player has a game; always highlighted; tag "Lobby" or "Running". It is not a way back after leaving.
- **Nickname page** (FR-005): page links disabled; brand, language and theme work.
- **Leave dialog** (FR-006 to FR-011): "Stay" is the default and Escape; the confirm button names the action. Texts: "Leave the running game?", "Cancel your planned game?" (host), "Leave the lobby?" (guest). The result page leaves without a dialog.
- **Theme button** (FR-012 to FR-014): shows the current mode (sun or moon); one click switches to the other.
- **Layout** (FR-018): menubar and pages max 1200 px, forms and lobby/result centred in a narrow column; the table is exempt but keeps the scale rules of spec 008.
- **Minimum window (695 px)**: version hidden, entries stay reachable.

## Requirement traceability

| Region                   | Requirements                           |
| ------------------------ | -------------------------------------- |
| Menubar, active entry    | FR-001, FR-002, FR-003, FR-016         |
| Current game status      | FR-004                                 |
| Nickname page state      | FR-005                                 |
| Leave dialog             | FR-006, FR-007, FR-008, FR-009, FR-010 |
| Shared leave entry point | FR-011                                 |
| Theme button             | FR-012, FR-013, FR-014                 |
| Centred pages, widths    | FR-018                                 |
| Create-game form (P3)    | FR-015 (only centred, not restyled)    |

## Out of scope for this mockup

- Real icons (PrimeIcons sun and moon in the app), German texts, keyboard behaviour of the menubar, focus return after the dialog, error case when leaving fails.
- Game table, dice, log, open-games list (stand-ins, unchanged).
- Restyling of the create-game form fields (P3).

## Open points carried into planning

- In a running game the header currently scales with the table stage (spec 008). The plan decides whether the menubar stays at 1200 px or scales with the stage there.
- The table is not enlarged above its 992 px stage; making it larger on big windows would change spec 008.

## Fidelity note

Colours are the real Terracotta tokens in light and dark; dimensions follow the app. Logo, flag, icons and the PrimeNG look of the menubar and dialog are stand-ins; the real components may differ in detail.
