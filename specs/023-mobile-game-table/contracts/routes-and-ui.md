# Contract: routes and table UI

## Routes (base `/m/`)

| Path        | Screen  | Guard                      | Change                  |
| ----------- | ------- | -------------------------- | ----------------------- |
| `table/:id` | Table   | session + membership guard | new; replaces `started` |
| `started`   | removed | -                          | `**` redirects to `''`  |

Entry: the lobby navigates to `table/:id` when the game starts; the list and a reload send a seated player of a running game to `table/:id` (FR-017). Not a seated player: redirect to the list. Leave and game over end on `''`.

## Layout regions (landscape, 568-932 × 320-430)

| Region  | Width     | Content                                                                    |
| ------- | --------- | -------------------------------------------------------------------------- |
| Players | 10-13 rem | seat rows: name (ellipsis), score, markers, active ▶ + border + fill       |
| Board   | flexible  | strip (rules, timer, Leave), card, turn points, dice 46-56 px, status line |
| Actions | 6.5-8 rem | draw, throw, select, bank; ≥ 48 px high, text labels, reason text above    |

## Behaviour contract

- Portrait: blocker with rotate message and Leave; table stays mounted.
- Safe-area padding on all sides; no scroll, no zoom.
- Leave opens a confirm dialog while the game runs; game over shows the ranking (≤ 8 players) with Leave only.
- Reduced motion: no dice animation, no confetti. Languages en/de, light/dark follow M1 settings.
- Landmarks: buttons are real `<button>` elements with visible focus; dialogs trap focus.
