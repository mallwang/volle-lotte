# Sounds

One file per cue; each can be replaced by another mp3 of the same name without a code change.

| File              | Plays                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `game-start.mp3`  | the game starts (also after a rematch), for every seated human                                   |
| `your-turn.mp3`   | the turn passes to the player, after the previous roll and notice                                |
| `countdown.mp3`   | once per second in the last 5 seconds of the player's own turn timer                             |
| `volle-lotte.mp3` | the player's own Volle Lotte, after the dice have stopped                                        |
| `points.mp3`      | points are credited to the player's own score, with the result notice (not for the winning bank) |
| `defeat.mp3`      | the game-over window opens and the player did not win                                            |
| `victory.mp3`     | the player wins the game                                                                         |

New files should stay under 100 KB each. `game-start.mp3` (284 KB), `volle-lotte.mp3` (153 KB) and `victory.mp3` (313 KB) are above that for now; shorter versions are welcome (see the suggested lengths in `specs/019-sounds/`).
