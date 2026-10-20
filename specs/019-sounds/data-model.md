# Data Model: Sounds

No server, protocol or persistence change. Everything below lives in the frontend.

## Sound cue

| Cue           | File (`apps/frontend/public/sounds/`) | Trigger (where)                                                   |
| ------------- | ------------------------------------- | ----------------------------------------------------------------- |
| `victory`     | `victory.mp3` (exists)                | Game-over modal opens and you won (`Celebration`, spec 013)       |
| `game-start`  | `game-start.mp3`                      | Phase `lobby` to `running` in one page view (`game/game.ts`)      |
| `your-turn`   | `your-turn.mp3`                       | Table `mine()` from `false` to `true`, not the first value        |
| `countdown`   | `countdown.mp3`                       | Each whole second in the last 10 s of `deadlineAt()` while mine() |
| `volle-lotte` | `volle-lotte.mp3`                     | Revealed `turn` entry `volleLotte` with `seat === you.seat`       |

- One audio element per cue, created on first use or on `preload()`.
- Playing a cue rewinds it first (restart, FR-012); cues do not stop each other.

## Sound setting

| Field   | Type      | Default | Stored as                           |
| ------- | --------- | ------- | ----------------------------------- |
| `muted` | `boolean` | `false` | `localStorage['vl-muted'] = 'true'` |

- `toggle()`: flips `muted`, writes storage (errors ignored), and when muting stops every cue.
- While `muted`, `play()` returns without touching any audio element.

## State transitions

```text
your-turn:   mine: (baseline) -> false -> true  => play
                               true  -> false   => nothing (and cancel countdown)
countdown:   mine && deadlineAt = at  => schedule at-10s ... at-1s (future ones only)
             mine false | deadlineAt change | table destroyed => cancel all
game-start:  phase: lobby -> running  => play ; first phase seen = running => nothing
```
