# Design: Lobby and multiplayer

**Mockup**: [mockup.html](mockup.html) (static, non-functional, local file; no Artifact link because the Artifact tool was unavailable).

## Status of the look

No theme or component library exists yet. The mockup uses a neutral placeholder style; colours, fonts and the hand-drawn look are decided later, after the final result has been reviewed. Only layout, hierarchy and states are binding.

## Screens

| Screen      | Layout                                                                                                                                                                                                                     | Spec                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Nickname    | Centred card: nickname field, Continue.                                                                                                                                                                                    | US1, anonymous identity |
| Main lobby  | List of games (name, host, target score, seats, padlock, full/running state), Join with password field and error line (wrong password, attempts left, lock), Create game button.                                           | US1, rate limiting      |
| Create game | Single column form: name, password, seats 2-8, rules (target score, minimum points, doubling, card counts), note that rules are fixed afterwards.                                                                          | US1                     |
| Game lobby  | Seat grid: you (host star, Ready), human, computer with difficulty select (easy/medium/hard/random hidden), free seat, locked seats with padlock. Host actions per seat, Ready, Start disabled until all humans are ready. | US2, FR-025..027        |
| Game table  | Left: current player, turn points, card, thrown dice (tap to set aside), throw/bank, rejection message. Right: score table (active row, offline tag) and event log. Dice animation is a placeholder.                       | US3                     |
| Player left | Banner with 60 s countdown, then host decision (put in computer with difficulty, or free seat); others see "Waiting for the host".                                                                                         | US4                     |
| Result      | Ranking with shared ranks, back to main lobby.                                                                                                                                                                             | US3                     |

Mobile: two-column areas (table, create form) collapse to one column, seats stack, controls keep a 44 px touch size.

## Out of scope for the mockup

Dice and cup look, animation and manual throw (dice UI feature), theme, validation and server rules (hashing, rate limits, tokens), persistence.
