# Implementation Plan: Active Game Table UI

**Branch**: `007-active-game-table-ui` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-active-game-table-ui/spec.md`; approved layout in [design.md](design.md) / [mockup.html](mockup.html).

## Summary

Replace the monolithic `Table` template (phase `running`) with an oval poker-style table: seat cards around a CSS-grid board, a CSS-rendered active card, a tidy draw pile and an untidy discard pile in the centre, and dice/secured/actions and log as separate standalone components. Pure frontend change: the discard height is derived from `sum(rules.cardCounts) - deckSize - activeCard`, so there is no protocol or backend change. Behaviour (dice animation, bust, timers, a11y, i18n) stays in the `Table` container and is passed down through signal inputs and outputs.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular 22 (standalone components, signals)

**Primary Dependencies**: PrimeNG 22 (Terracotta preset), PrimeIcons; no new dependency

**Storage**: N/A (no protocol or persistence change)

**Testing**: Angular unit-test builder (Vitest) for component and pure-function specs, run via `npm run test`; pure view-model helpers tested without TestBed

**Target Platform**: Desktop browsers (mobile layout is a later spec); light and dark theme

**Project Type**: Web application (Nx monorepo), change is confined to `apps/frontend`

**Performance Goals**: No visible re-render jump of piles; seat/pile rendering is derived from signals, at most 8 seats and 8 pile layers

**Constraints**: Tokens only (no hard-coded colours), contrast pairs checked by the existing test, keyboard/focus/not-colour-alone, EN/DE keys complete (existing i18n spec), component style budget 4kb warning / 8kb error

**Scale/Scope**: 2–8 seats, 6 new components, `table.ts` reduced from ~520 lines to a thin container

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                    | Result | Note                                                                                              |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| I Server-Authoritative State | Pass   | UI only reads `GameView`; the discard count is derived, nothing new is sent or trusted            |
| II Pure Tested Rules Engine  | Pass   | No rules change. Total card count is a pure helper over `rules.cardCounts`                        |
| III Test Coverage (80%)      | Pass   | Pure helpers and each component get specs; no new skip-list entries                               |
| IV One Container / SQLite    | Pass   | No deployment or storage change                                                                   |
| V Anonymous Play             | Pass   | No identity change                                                                                |
| VI UX First                  | Pass   | Mockup approved; keyboard, focus, contrast and non-colour cues are acceptance items (FR-013..015) |
| VII Simplicity               | Pass   | No new dependency or abstraction; CSS grid areas instead of trigonometric seat placement          |

Post-design re-check: unchanged, no violations.

## Project Structure

### Documentation (this feature)

```text
specs/007-active-game-table-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── design.md
├── mockup.html
├── contracts/
│   └── components.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
apps/frontend/src/
├── styles.css                          # board, felt, seat, pile, card classes (tokens only)
└── app/
    ├── core/
    │   ├── table-view.ts               # pure helpers: seatAreas, totalCards, pileLevel, discardLayers
    │   └── table-view.spec.ts
    ├── i18n/{en,de}.ts                 # new keys (pile levels, seat states, card/pile labels)
    ├── shared/
    │   └── game-card.ts                # CSS card (2:3), replaces card-tile usage on the table
    └── table/
        ├── table.ts                    # thin container: state, actions, roll/bust, dialogs
        ├── table-layout.ts             # grid areas, oval felt, content slots
        ├── player-seat.ts              # seat card (icon, name, score, timer, states)
        ├── card-deck.ts                # draw pile with count and level
        ├── discard-pile.ts             # untidy pile from played count
        ├── dice-area.ts                # dice, bust, actions, secured panel
        ├── game-log.ts                 # log list
        └── *.spec.ts                   # one spec per component
```

**Structure Decision**: Keep everything inside `apps/frontend` (existing `table/` folder for table-only components, `shared/` for the reusable card, `core/` for pure view-model helpers). `shared/player-tile.ts` is replaced by `PlayerSeat` and removed if nothing else uses it.

## Complexity Tracking

No constitution violations; nothing to justify.
