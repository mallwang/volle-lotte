# Design: Mobile lobby and game setup

**Mockup**: [mockup.html](mockup.html) (static, non-functional, local file; no Artifact link because the Artifact tool was unavailable).

## Status of the look

The mockup reuses the terracotta tokens of the desktop theme (status chips, dark mode, 44 px touch targets) but does not choose components. Only layout, hierarchy and states are binding.

## Layout rules

- Portrait (320-480 px wide) and landscape (568-932 px wide, 320-430 px high) share the same screens.
- Primary actions (Create game, Join, Start, Withdraw, Leave, Withdraw ready) live in a fixed bottom action bar or a full-width button; lists, forms and settings scroll above it.
- The app bar shows the title plus language, sound and theme buttons.
- Long names and German text wrap; they never hide or push out actions.
- With the on-screen keyboard open, the focused field and the action bar stay reachable.

## Screens

| Screen        | Layout                                                                                                                                                                                  | Spec       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Nickname      | Single column: field with hint, Continue.                                                                                                                                               | US1        |
| Game list     | Title with Create game button; cards (name, free-seat chip, host, target, seats, password/open/full/running chip, Join). One column in portrait, two in landscape. Empty state message. | US1        |
| Join dialog   | Password field, Cancel and Join. Bottom sheet in portrait, centred dialog in landscape.                                                                                                 | US2        |
| Create game   | Form (name, password, seats, target, minimum, doubling, computers), fixed Cancel / Create bar. One column in portrait, two in landscape.                                                | US2        |
| Lobby (host)  | Seat cards with ready, remove player, computer difficulty and risk, add computer, lock seat; collapsible settings editable; Withdraw game / Start game bar. Two columns in landscape.   | US2, US3   |
| Lobby (guest) | Same seats, read-only settings with note; Leave / Withdraw ready bar.                                                                                                                   | US2        |
| Game started  | Notice that the phone game table follows in M2, button back to the games.                                                                                                               | Edge cases |

## Out of scope for the mockup

Session persistence, validation and rate-limit messages (same copy as desktop), live updates, rejoin / end / watch of running games, game log, reconnect banner, presets and per-card-type options (decided in the plan), the game table and the portrait rotate blocker (M2).
