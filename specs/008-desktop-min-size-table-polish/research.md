# Research: Desktop Minimum Size and Table Polish

No NEEDS CLARIFICATION remain. The spec's open points are decided here.

## 1. Scaling mechanism

- **Decision**: Outer box with width `992*s` and height `900*s` (centred with `margin-inline: auto`), inner box fixed 992x900 with `transform: scale(s); transform-origin: top left`.
- **Rationale**: The outer box reserves exactly the scaled space, so there is no scrollbar and no overflow. Transforms are supported everywhere and `getBoundingClientRect` reflects them, so tooltips stay correct.
- **Alternatives**: CSS `zoom` (shorter, but differing behaviour in overlay positioning across engines); viewport units / `clamp()` rem scaling (changes relative positions through rounding, wrapping and fixed px values, so it breaks SC-002); a second compact layout (rejected in the clarification).

## 2. Viewport source

- **Decision**: Signal fed by `window.innerWidth/innerHeight` via a `resize` listener (rAF-throttled) in a root `TableScale` service. `innerHeight` excludes browser chrome and includes a horizontal scrollbar, which the no-overflow rule keeps absent.
- **Rationale**: Browser zoom changes `innerWidth/innerHeight` in CSS px, so zoom edge cases need no extra code.
- **Alternatives**: `ResizeObserver` on `documentElement` (works, but gives no gain here); `matchMedia` (no continuous values).

## 3. Header scaling

- **Decision**: Header is part of the stage and scales with the table.
- **Rationale**: FR-002's cut-off (695x630 px) is derived from 992x900 including the header; an unscaled header (about 68 px) would lift the minimum height to about 660 px and exclude 1024x640.
- **Alternatives**: Unscaled header with table height = viewport - header (rejected above).

## 4. Minimum width for portrait tablets

- **Decision**: No separate minimum width. The scale rule alone applies.
- **Rationale**: Simplicity (VII); portrait tablets at scale 0.77 are playable and the desktop target already covers tablets. Revisit with R3 (mobile app).

## 5. Keeping the table alive below the minimum

- **Decision**: Blocking hint overlays/replaces the stage visually while `Table` stays mounted but hidden.
- **Rationale**: FR-006/007: returning must not reload, restart the dice animation, bust notice or turn timer. Server timers run regardless.
- **Alternatives**: `@if` removal (restarts local state and animations).

## 6. Focus ring and tab order

- **Decision**: Global `:focus-visible { outline: 3px solid var(--p-primary-color); outline-offset: 2px }` for buttons, links, selects and dice (dice-tile already uses 3 px). Check ring contrast against both backgrounds; add a second inner ring (`box-shadow` with `--vl-bg`) if the primary colour has too little contrast on filled buttons. Under scale 0.7 a 3 px ring renders as about 2 px, so use 4 px if the walk-through shows it too thin.
- **Tab order**: Header is first in the DOM (`app.html`), so the reported "header after table" is probably caused by DOM order inside the table layout (seats listed clockwise, buttons in the centre) or by `tabindex`. Reproduce with a Playwright tab-through first, then fix at the cause (DOM order or removing stray tab stops); do not use positive `tabindex`.
- **Seat cards**: stay non-interactive (clarification).

## 7. Contrast and text fit

- **Decision**: Regression check only. Measure contrast of text and state markers in 2 themes x 2 languages; measure that no label overflows at scale 0.7 (German longest Secured-area texts). Fix only where a check fails. Smallest text at 0.7 is about 8.5 px (12 px x 0.71): if unreadable, either raise the minimum scale or enlarge the smallest text in the reference size (log text 0.75rem, seat captions).

## 8. Measurement

- **Decision**: Reuse the throw-away Playwright approach of the baseline (skill `verify-ui`) for the repeat measurement at 1024x640, 1280x650 and 1920x950; results are written into the PR description, not into a permanent suite (R2).
