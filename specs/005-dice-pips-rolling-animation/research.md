# Research: Dice Pips and Rolling Animation

No NEEDS CLARIFICATION remained after `/speckit-clarify`; decisions below.

## Pips rendering

- **Decision**: inline-template component `die-face` with a 3×3 CSS grid; pip positions from a static map (value → cell indices). Blank = same box without pips. Log dice use the same component at `1.3em`.
- **Rationale**: no assets, scales with font size, themeable via CSS variables, trivially testable (map is pure).
- **Alternatives**: SVG per face (more markup, no gain); Unicode ⚀–⚅ glyphs (inconsistent fonts, not themeable).

## Rolling animation

- **Decision**: client-only. On a new `thrown` log entry (not on initial load/reconnect) plan per-die durations `rollDurations(n, [2000, 5000])` (computer + `fastComputerDice`: `[1000, 2500]`). While rolling, a die cycles faces with a CSS keyframe tumble and a cheap face-swap interval (one shared timer) and settles to the server value at its own deadline. Reduced motion: no tumble/cycling, dice dimmed blank, static "Dice are rolling…" live-region text; value appears at the deadline.
- **Rationale**: server value is already in the state, so the animation only delays revealing it (Constitution I). One shared timer keeps it simple.
- **Alternatives**: server-sent durations (needless protocol, contradicts spec assumption that timing is per-viewer); Web Animations/GSAP (new dependency).

## Reveal gating (FR-010)

- **Decision**: the existing log cursor in `Table` (`seen`) advances only when `DiceRollService.rolling()` is false; log rendering also hides entries beyond the cursor. State arriving mid-roll (turn change, leave) never changes dice values already shown; pending reveal is flushed when the roll ends. Reload/reconnect: cursor starts at the current log length and no roll runs (FR-014).
- **Alternatives**: delaying the server push (breaks sync and reconnect consistency).

## Skip animation (FR-015–017)

- **Decision**: `DicePrefs` signal backed by `localStorage['vl-skip-dice']`; when on, `DiceRollService` plans zero durations (values and log appear immediately, nothing locked). Game flow for others is unaffected because pacing is server-side.

## Computer pacing (FR-013, FR-019)

- **Decision**: in `GameRoom.scheduleComputer` replace the random delay: after a `thrown` event wait `rollMax + 3000 ms` (+ small margin for latency), otherwise 2000 ms. `rollMax` = 5000, or 2500 with `fastComputerDice`. For a computer `select`, first set `preview` to the chosen dice and emit (human tables show the same highlight), then apply the action after 2000 ms.
- **Rationale**: the server cannot observe client animations; waiting the worst case guarantees the dice have stopped.
- **Alternatives**: client acks "roll finished" (extra protocol, stalls on a missing client).

## Fast computer dice (FR-018)

- **Decision**: `fastComputerDice: boolean` on `GameRoom`/`GameView`, changed by new intent `game:settings` (host only, allowed in lobby and running). Not part of `Rules`, because rules are fixed at creation and affect scoring.
- **Protocol**: `PROTOCOL_VERSION` 1 → 2.

## Selection cue (FR-020)

- **Decision**: selected die is lifted (`translateY(-5px)`), 3 px primary border and shadow; computer picks add a small computer badge. No checkmark. Hit area ≥ 44 px via padding around the visual die (design.md fidelity note).

## Accessibility (FR-003, FR-012)

- Die keeps `aria-label` (`dice.state`); pips are `aria-hidden`. Log dice carry a text alternative with the value. A visually-hidden/reduced-motion `role="status"` region announces "Dice are rolling…" for everyone.
