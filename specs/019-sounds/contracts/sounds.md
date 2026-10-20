# Contract: Sounds

No socket message, payload or `PROTOCOL_VERSION` changes. The contract is the frontend service API, the menubar control and the asset paths.

## `Sounds` service (`apps/frontend/src/app/core/sounds.ts`, `providedIn: 'root'`)

```ts
export type SoundCue =
  'victory' | 'game-start' | 'your-turn' | 'countdown' | 'volle-lotte' | 'points' | 'defeat';

class Sounds {
  /** true = every cue is silent; read from localStorage `vl-muted`, default false. */
  readonly muted: Signal<boolean>;
  /** Flip `muted`, remember it on the device, stop every cue when muting. */
  toggle(): void;
  /** Create and load every cue's audio element; safe to call repeatedly. */
  preload(): void;
  /** Rewind and play the cue once; no-op while muted; a refused play is ignored. */
  play(cue: SoundCue): void;
  /** Pause and rewind the cue (no-op if it never played). */
  stop(cue: SoundCue): void;
}
```

Guarantees:

- `play` never throws and never rejects, also before any user interaction or for a missing file (FR-011).
- `play` of a cue that is still playing restarts it; other cues are not touched (FR-012).
- `toggle` to muted pauses every cue immediately (FR-009).

## Pure helper

```ts
/** Milliseconds from `now` to each beep at at-5s, at-4s, ..., at-1s that is still ahead. */
export function countdownDelays(at: number, now: number): number[];
```

Examples: `countdownDelays(30_000, 0)` gives 5 values `25_000 ... 29_000`; `countdownDelays(3_500, 0)` gives 3 values `500, 1_500, 2_500`; `countdownDelays(0, 1)` gives `[]`.

## Callers

| Caller                           | Calls                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Celebration.preload/start/stop` | `sounds.preload()`, `sounds.play('victory')`, `sounds.stop('victory')` (replaces its own `Audio`) |
| `Table` constructor              | `sounds.preload()`; effects for `your-turn` and `countdown`                                       |
| `Table.process()`                | `sounds.play('volle-lotte')` for the own Volle Lotte, `sounds.play('points')` for the own credit  |
| `Table` constructor              | `sounds.play('defeat')` when the game-over modal opens for a player who did not win               |
| `Game` (game page)               | `sounds.play('game-start')` on `lobby` to `running`                                               |
| `App` menubar                    | `sounds.muted()`, `sounds.toggle()`                                                               |

## Menubar control (`apps/frontend/src/app/app.html`)

- Position: menubar end group, after the language select, before the theme button.
- `p-button`, `rounded`, `text`, `severity="secondary"`; icon `pi pi-volume-up` (on) or `pi pi-volume-off` (muted).
- `aria-pressed` = `muted`; `ariaLabel` = `sound.on` or `sound.off` + `. ` + action; `pTooltip` = action.

| Key            | en             | de                 |
| -------------- | -------------- | ------------------ |
| `sound.on`     | Sounds: on     | Töne: an           |
| `sound.off`    | Sounds: off    | Töne: aus          |
| `sound.mute`   | Mute sounds    | Töne stummschalten |
| `sound.unmute` | Turn sounds on | Töne einschalten   |

## Assets

`apps/frontend/public/sounds/` served at `/sounds/`: `victory.mp3` (exists), `game-start.mp3`, `your-turn.mp3`, `countdown.mp3`, `volle-lotte.mp3`, `points.mp3`, `defeat.mp3` (copies of `victory.mp3` until replaced; final files at most 100 KB each).
