# Design: Mobile game table

**Mockup**: [mockup.html](mockup.html) (static, non-functional, local file; no Artifact link because the Artifact tool was unavailable).

## Status of the look

The mockup reuses the terracotta tokens of the desktop and mobile lobby theme (light/dark, status chips) but does not choose components. Only layout, hierarchy and states are binding. Dice faces, card tiles and the confetti are static stand-ins.

## Layout rules

- Landscape only, 568-932 px wide and 320-430 px high. The table is one screen: no scrolling, no zoom. Safe areas (notch, rounded corners, home indicator) are added as padding on all sides.
- Three areas side by side, separated by thin vertical lines: players on the left (about 10-13 rem), board in the centre, actions on the right (about 6.5-8 rem).
- Players: one row per seat (up to 8) with name, score and computer marker. The active seat has a thick border, a ▶ marker and a fill. Gone players are struck through. Long names are shortened with an ellipsis; scores and marker stay visible.
- Board: a top strip with rules, turn timer and a labelled Leave button (not a menu icon), then the card tile with turn points, the dice and a status line. Dice are 46-56 px with 6-8 px gaps.
- Actions: narrow buttons, at least 48 px high, labels wrap onto two lines (for example "Punkte würfeln"). Bust, Volle Lotte and Street messages and other info text sit in the free space above the buttons, so card, turn points and dice are never covered.
- Game over: a dialog listing all players (up to 8) with the winner on top, and a leave action. Nicknames are capped at 20 characters everywhere; computers show the animal name only (the last word of the generated name).
- Portrait: a rotate blocker replaces the table. Leave stays reachable. Rotating back restores the same state.
- Dice roll animation and the confetti on winning stay as on desktop, and both respect reduced motion. How they are reused on the phone is decided in the plan.

## Screens and states

| Scene / state             | Layout                                                                                     | Spec                        |
| ------------------------- | ------------------------------------------------------------------------------------------ | --------------------------- |
| Draw                      | Card deck prompt, Draw action.                                                             | US1, FR-006, FR-008         |
| Throw                     | Throw action, dice area empty or locked.                                                   | US1, FR-006, FR-012         |
| Select dice               | Dice selectable by touch, confirm action disabled until the selection is valid, hint text. | US1, FR-006, FR-007, FR-012 |
| Throw or bank             | Throw remaining dice and Bank actions, turn points visible, disabled reason shown.         | US1, FR-007, FR-008         |
| Other player's turn       | Same table, no active controls, live follow of the active seat.                            | US1, US2, FR-008, FR-009    |
| Bust                      | Result message above the buttons, dice locked.                                             | US1, FR-011                 |
| Volle Lotte               | Result message above the buttons, continue action.                                         | US1, FR-006, FR-011         |
| Street card               | Info text above the buttons.                                                               | US4, FR-011                 |
| Two, four and eight seats | Seat list scales to the small viewport without hiding scores or the active marker.         | US2, FR-008, FR-009, FR-010 |
| Safe areas                | Extra padding left, right and bottom; dice keep room.                                      | FR-014, FR-016              |
| English and German        | Wrapped labels and long names do not push controls off screen.                             | FR-015, FR-022              |
| Light and dark            | Both themes.                                                                               | FR-022                      |
| Leave dialog              | Confirm and back.                                                                          | US4, US3, FR-004, FR-019    |
| Game over                 | Ranking of all players, leave action.                                                      | US4, FR-018                 |
| Portrait blocker          | Rotate message, Leave reachable, state preserved.                                          | US3, FR-002, FR-003, FR-004 |

## Out of scope for the mockup

Sounds, game log, rematch, reconnect and connection-loss banners, spectators (M3); animation details (dice roll, card draw, confetti are shown static); the turn-timer behavior, disconnected and replaced-by-computer seat states beyond the computer marker (FR-010, visible state to be fixed in the plan); double-tap protection and server confirmation (FR-013); the entry from lobby and list (US5, FR-017), whose logic has no screen of its own.
