# Research: Active Game Table UI

## CSS card instead of PNG

- **Decision**: New `GameCard` component renders the card with CSS (2:3 via `aspect-ratio`), value as text, name from `card.<type>`, icon from PrimeIcons.
- **Rationale**: Themes (light/dark) and language come for free from tokens and i18n; PNGs would need per-theme/per-language variants.
- **Alternatives**: PNG assets (no theming/i18n); inline SVG per card (more markup, no gain).

## Discard pile without protocol change

- **Decision**: `played = totalCards - deckSize - (activeCard ? 1 : 0)`, `totalCards = sum(rules.cardCounts)`. Layers = `min(8, ceil(played / 6))`; per-layer rotation and offset are pure functions of the layer index (as in the mockup).
- **Rationale**: All inputs are already in `GameView`; index-based jitter is stable across re-renders. After a reshuffle `deckSize` refills, so `played` drops to 0 naturally. Clamp at 0.
- **Alternatives**: Server sends the discard list (protocol change, rejected); random jitter (jumps on re-render).

## Draw pile levels

- **Decision**: Level from `deckSize / totalCards`: empty = 0; few ≤ 1/6; medium ≤ 1/2; many otherwise. Layers 0/2/4/6 as in the mockup. Count is always shown as text, so the level is never colour-only.
- **Alternatives**: Absolute thresholds (break with custom card counts).

## Seat layout

- **Decision**: CSS grid of three columns (seat column, centre, seat column) with up to four rows and an oval felt behind it. Own seat is rotated to the first position (`l1`, top left); the rest alternate right and left from top to bottom (`r1`, `l2`, `r2`, ...) using `seatAreas(count)`.
- **Rationale**: Deterministic, testable as a pure function, no trigonometry or absolute positioning, keeps tab order = DOM order = turn order.
- **Alternatives**: Absolute positions on an ellipse (fragile at small widths, harder to test).

## Component split

- **Decision**: Standalone, signal `input()`/`output()` components; `Table` keeps all state (selection, roll/bust, log reveal, dialogs) and passes values down. Child components are presentational.
- **Rationale**: The roll/bust/log-reveal logic is tightly coupled and already tested through `Table`; moving it would risk behaviour changes (FR-013).
- **Alternatives**: Move state into a service (more indirection, no reuse need).

## Turn timer in the seat

- **Decision**: Reuse `TurnTimer` inside the active `PlayerSeat`; keep the existing condition (hidden while rolling or showing a bust).

## Accessibility and i18n

- **Decision**: Seats are list items in turn order with an accessible name (name, score, human/computer, offline, you, active). Active state also uses an icon/label, not only colour. New keys added to `en.ts` and `de.ts` (existing i18n spec enforces parity).
