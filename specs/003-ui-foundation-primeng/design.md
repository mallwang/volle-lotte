# Design: UI foundation

**Mockup**: [mockup.html](mockup.html) (static, non-functional, local file; no Artifact link because the Artifact tool was unavailable). It also contains the rejected palettes Apricot and Sorbet for comparison.

## Status of the look

The palette **Terracotta** is approved: warm, earthy orange with pastel status colours. Values are tokens for a custom PrimeNG preset (PrimeNG is the chosen toolkit; spacing, radii and component details come from the preset, so the mockup is indicative, layout and states are binding). Dice, card and cup are labelled placeholders (FR-017).

| Token      | Light                    | Dark                     | Use                                   |
| ---------- | ------------------------ | ------------------------ | ------------------------------------- |
| bg         | `#fbf1ea`                | `#1c1411`                | page                                  |
| surface    | `#fffaf6`                | `#2a1d18`                | cards, tiles, dialogs                 |
| surface-2  | `#f3dccd`                | `#3b2a22`                | table felt, active tile, locked seats |
| line       | `#e6c3ad`                | `#52382c`                | borders                               |
| text       | `#3a241b`                | `#f5e6dc`                | body                                  |
| muted      | `#7b5a4c`                | `#cbaa98`                | hints                                 |
| primary    | `#a8431f`                | `#f08a5d`                | buttons, active player, selected dice |
| on-primary | `#fff`                   | `#2a1008`                | text on primary                       |
| mint       | `#d3e8d6` / on `#1f4a2c` | `#244a38` / on `#c9f1db` | ready, ok                             |
| lavender   | `#e6dcef` / on `#44305f` | `#3a3159` / on `#e0d8fa` | info, host                            |
| butter     | `#f6e3a8` / on `#5a4300` | `#4d4018` / on `#ffefb0` | warning, offline                      |
| rose       | `#f6d0cb` / on `#7a2118` | `#5a2626` / on `#ffd9d9` | error, bust                           |

Status is always colour plus text or icon. Default theme follows the system setting; the app bar has a manual toggle (FR-002). Contrast of primary on-primary must be verified at implementation (target AA).

## Screens

| Screen          | Layout                                                                                                                                                                                                   | Spec                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| App shell       | Top bar: logo, game name chip (in a game), nickname chip, theme toggle. Page content below.                                                                                                              | US1, FR-001, FR-002 |
| Nickname        | Centred card: field, Continue.                                                                                                                                                                           | US2, FR-004         |
| Main lobby      | Heading with Create game button; list rows: name, host and rules, seats chip, padlock, state chip (Full/Running), Join (disabled when not joinable).                                                     | US2, FR-005         |
| Create game     | Centred form card: name, password, seats, target score, minimum points, inline error under the field, rules-fixed note, Cancel / Create.                                                                 | US2, FR-004         |
| Game lobby      | Grid of 8 seats (4 columns desktop, 2 on phone): human/computer/free/locked, host, ready, offline chips; host actions per seat; Leave and Start game at the bottom.                                      | US2, FR-006         |
| Table (my turn) | Desktop: left column players row (active tile highlighted, score, "Your turn"), felt area (card, turn points, carried/run/deck, dice, actions), right column scores and scrollable log. Mobile: stacked. | US3, FR-007..FR-010 |
| Dice            | Tap toggles selection (raised, check badge); set-aside dice dashed and disabled; actions: Set aside selected (n), Throw remaining (n), Bank (disabled with reason hint, e.g. minimum points).            | FR-008, FR-009      |
| Other's turn    | Same table, actions disabled, banner naming the active player.                                                                                                                                           | US3                 |
| 8 players       | Player tiles shrink to a compact grid (4x2, 2x4 on phones); the rest is unchanged.                                                                                                                       | FR-007              |
| Log             | Fixed height, scrollable, `aria-live="polite"`, newest entries announced.                                                                                                                                | US4, FR-012         |
| Offline         | Butter banner with countdown, offline chip on the tile.                                                                                                                                                  | US4, FR-013         |
| Host decision   | Modal dialog (focus trapped): free the seat or put in a computer with difficulty.                                                                                                                        | US4, FR-013, FR-015 |
| Toast           | Top right (mint for success), auto-dismiss; errors as rose toast or inline.                                                                                                                              | FR-014              |
| Result          | Centred ranking card, winner highlighted in butter, equal scores share a rank, Back to lobby.                                                                                                            | FR-011              |

## Out of scope for the mockup

Final dice, card and cup art, animation, cup drag (FR-017), reduced-motion behaviour (FR-016), keyboard and focus order details (FR-015, verified in implementation), the Angular/PrimeNG upgrade (FR-019, planned), unchanged protocol and rules (FR-018).
