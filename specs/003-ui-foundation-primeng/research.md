# Research: UI Foundation (PrimeNG)

No `NEEDS CLARIFICATION` items remain. Sources: PrimeNG theming docs (via Context7, v20 docs; the preset API is
unchanged since v18) and the PrimeNG 22.1.2 peer ranges.

## R1 - Toolkit version and Angular upgrade

- **Decision**: Add `primeng` ^22.1.2 and `@primeuix/themes`; bump every `@angular/*` package, `@angular/cdk`
  (new dependency) and the Angular CLI/build/devkit packages from `~22.0.4` to `~22.1.x` in one commit.
- **Rationale**: PrimeNG 22.1 requires `@angular/core|common|forms|router|platform-browser ^22.1.0` and
  `@angular/cdk ^22.1.0`. A minor bump inside the same major needs no code migration.
- **Alternatives**: PrimeNG 22.0 or 21.x (no peer bump) - rejected, the maintainer asked for 22.1 and the older lines
  age out sooner.
- **Check at implementation**: `@nx/angular` 23.1.1 must accept Angular 22.1 (run `npm ls`, `nx build`); if not, bump
  Nx within the same step.

## R2 - Theme: custom preset on top of Aura

- **Decision**: `definePreset(Aura, {...})` in `apps/frontend/src/app/theme/terracotta-preset.ts`. Override
  `semantic.primary` (terracotta scale), `semantic.colorScheme.light|dark` (`primary.color`, `inverseColor`,
  `hoverColor`, `activeColor`, `highlight`, `surface`) from the tokens in [design.md](design.md). Status colours
  (mint, lavender, butter, rose) are exposed as app CSS variables in `styles.css` and used by the tile components,
  not as PrimeNG tokens.
- **Rationale**: Overriding semantic tokens restyles every PrimeNG component consistently with no per-component CSS;
  Aura is already accessible and touch-sized. Tokens that Aura defines under `colorScheme` must be overridden under
  `colorScheme` (docs), hence the light/dark split.
- **Alternatives**: Custom `{}` preset from scratch (large, error prone); Lara/Material presets (different shape
  language than the mockup); plain CSS overrides (fights the component styles).
- **Registration**: `providePrimeNG({ theme: { preset, options: { prefix: 'p', darkModeSelector: '.app-dark',
cssLayer: false } } })` in `app.config.ts` (no Tailwind, so no layer ordering needed).

## R3 - Dark mode: default system, manual toggle

- **Decision**: One mechanism: the class `app-dark` on `<html>`, set by a `ThemeService` (signal `mode`:
  `system | light | dark`, persisted in `localStorage` key `vl-theme`). `system` resolves through
  `matchMedia('(prefers-color-scheme: dark)')` and follows live changes. No stored value and no media support = light
  (spec edge case).
- **Rationale**: PrimeNG's built-in `'system'` selector cannot be overridden by a toggle; a class selector handles
  both cases with one code path and no reload (spec edge case "switch mid-game").
- **Flash avoidance**: a small inline script in `index.html` sets the class before first paint using the same logic.
  Cost: one duplicated 3-line rule; without it a dark user sees a light flash on every load.
- **Alternatives**: `darkModeSelector: 'system'` plus an override class (two code paths, harder to test).

## R4 - Component mapping

| Screen / need       | PrimeNG components (module path `primeng/...`)                                        |
| ------------------- | ------------------------------------------------------------------------------------- |
| App shell, header   | plain layout + `button` (theme toggle `SelectButton`), `toast`, `message` (offline)   |
| Nickname, create    | `inputtext`, `inputnumber`, `checkbox`/`toggleswitch`, `select`, `button`, `message`  |
| Main lobby          | `card`, `tag`, `button`, `dialog` + `password` (join), `skeleton`/empty state         |
| Game lobby          | custom seat tile (`tag`, `avatar`, `button`, `menu` for host seat actions)            |
| Table               | custom player tile, dice tile, card tile; `button`; `progressbar` for reconnect timer |
| Log                 | scrollable container with `aria-live="polite"`; no table component                    |
| Disconnect decision | `dialog` (modal, focus trap) for host; `message` for others                           |
| Errors/transients   | `toast` (`MessageService`), server errors mapped by the existing `errorMessage()`     |
| Result              | `card` + ordered list with rank `tag`                                                 |

Dice, cards and seat tiles are app components because the later "dice UI" feature replaces the dice/card visuals
(FR-017); everything else is stock PrimeNG.

## R5 - Accessibility and contrast verification (SC-004, FR-015)

- **Decision**: (a) a pure unit test computes WCAG contrast for every text/background token pair in
  `terracotta-preset.ts` in light and dark and asserts >= 4.5:1 (3:1 for large text and UI borders); (b) a Jest test
  per screen runs `axe-core` on the rendered component in light and dark and fails on serious/critical violations
  (jsdom cannot judge colour contrast, so (a) covers it); (c) manual keyboard and screen-reader pass listed in
  [quickstart.md](quickstart.md).
- **Rationale**: Cheap, runs in the existing pre-push test run, catches regressions. `axe-core` is the only new
  dev dependency beyond the toolkit (see Complexity Tracking in the plan).
- **Alternatives**: Playwright + axe in a browser (accurate contrast, but a new e2e stack; deferred); manual only
  (not repeatable).

## R6 - Motion

- **Decision**: Rely on PrimeNG's own transitions and add one global `@media (prefers-reduced-motion: reduce)` rule
  in `styles.css` that disables transitions and animations. No custom animations in this feature.
- **Check at implementation**: confirm PrimeNG 22 animates via CSS (no `provideAnimationsAsync` needed); if the
  Angular animations provider is still required, add it and keep it behind the same reduced-motion rule.

## R7 - Table layout 2-8 players

- **Decision**: CSS grid, mobile first. Player tiles in a responsive grid (2 columns up to 5 players, compact
  one-line list rows at 320 px with 6-8 players); from 900 px the table area shows tiles around the dice/card
  centre as in the mockup, log in a side column. Breakpoints via CSS container/media queries, no JS layout logic.
- **Rationale**: Matches the approved mockup; no layout library needed.

## R8 - Data available for the table

- **Finding**: `GameView` already carries seats, `game.players`, `current`, `turn` (card, dice, phase, carried, run,
  free), `pending` (disconnect decision) and `log`. No protocol or rules change needed (FR-018). The turn-end message
  (FR-010) is derived from the existing log events (`bank`, `bust`, `turnLost`, `penalty`, `volleLotte`, `gameOver`)
  already formatted by `logText()`; the toast/banner reuses that function.
- **Open detail (not blocking)**: the reconnect countdown needs the disconnect timestamp and grace period. The
  current `disconnect-banner.ts` already computes a countdown; the redesign reuses that source rather than adding
  fields.

## R9 - Tests and coverage

- **Decision**: Keep the 80% frontend coverage. Component specs updated for the new templates; `ThemeService`,
  preset contrast, tiles and layout class logic get unit tests. `app.config.ts` is already a coverage exclusion; the
  preset file is data and covered by the contrast test, so no new Sonar exclusion is needed.
