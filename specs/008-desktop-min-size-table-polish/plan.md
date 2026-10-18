# Implementation Plan: Desktop Minimum Size and Table Polish

**Branch**: `008-desktop-min-size-table-polish` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-desktop-min-size-table-polish/spec.md`, approved layout in [design.md](design.md)

## Summary

Scale the running-game page (header plus table) as one fixed-size stage of 992x900 px with a uniform factor `min(1, vw/992, vh/900)`. Below the factor 0.7 a blocking hint replaces the stage; between 0.7 and 1 a dismissible notice is shown. In the same change, fix the focus ring (thicker, both themes), the tab order (header, table controls, log) and re-check contrast and text fit. Frontend only: no server, protocol or rules change.

## Technical Context

**Language/Version**: TypeScript 5, Angular (standalone components, signals), existing versions in `package.json`

**Primary Dependencies**: PrimeNG (Terracotta preset), no new dependency

**Storage**: N/A. The "notice dismissed" flag lives in memory (a signal) for the visit; no persistence

**Testing**: Vitest/Jest unit tests as already used in `apps/frontend` (pure scale function, service, notice and hint components); throw-away Playwright scripts for the measurement table (skill `verify-ui`); no permanent e2e (roadmap R2)

**Target Platform**: Desktop browsers and landscape tablets (Chromium, Firefox, Safari current)

**Project Type**: Web application (Nx monorepo), change limited to `apps/frontend`

**Performance Goals**: Resize reaction within 1 s (SC-004); scale is recomputed from a signal, no layout thrash

**Constraints**: No game-state, timer or animation restart on resize (FR-007); no horizontal scroll at any scale; dialogs and toasts stay outside the scaled stage

**Scale/Scope**: One route (`game/:id`, running phase), 2-8 players

## Constitution Check

| Principle                 | Status | Note                                                                              |
| ------------------------- | ------ | --------------------------------------------------------------------------------- |
| I. Server-authoritative   | Pass   | Presentation only; no intent or state change                                      |
| II. Pure rules engine     | Pass   | `libs/game-rules` untouched                                                       |
| III. Test coverage        | Pass   | Scale math and hint logic are unit tested; template-only parts may be skipped     |
| IV. One container, SQLite | Pass   | No backend change, no protocol bump                                               |
| V. Anonymous play         | Pass   | Not affected                                                                      |
| VI. UX first              | Pass   | UX mockup reviewed ([design.md](design.md)); implements keyboard, focus, contrast |
| VII. Simplicity           | Pass   | One service, two small components, CSS transform; no library, no second layout    |

Post-design re-check: still passes. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/008-desktop-min-size-table-polish/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui-contract.md
├── design.md, mockup.html
└── tasks.md             # created by /speckit-tasks
```

### Source Code

```text
apps/frontend/src/
├── styles.css                          # .vl-board fixed 44rem stays (it IS the reference size); stage, focus ring rules
└── app/
    ├── app.html / app.ts               # wrap header + main in the stage, render notice / hint
    ├── core/
    │   ├── table-scale.ts              # pure computeScale() + TableScale service (viewport signal, enabled flag, dismissed flag)
    │   └── table-scale.spec.ts
    ├── shared/
    │   ├── scale-notice.ts             # dismissible pill (not scaled)
    │   └── window-too-small.ts         # blocking hint (not scaled)
    ├── table/table.ts                  # enable/disable TableScale while the table is mounted; tab-order fix if needed
    └── i18n/en.ts, de.ts               # notice and hint strings
```

**Structure Decision**: Existing Angular app only. The scale state is a root service so `App` (owner of the header) and `Table` (owner of the "table is showing" fact) share it without coupling.

## Decisions (details in [research.md](research.md))

1. **Scale mechanism**: CSS `transform: scale(s)` on an inner box of fixed 992x900 px, inside an outer box sized `992*s x 900*s` and centred. Chosen over CSS `zoom` (inconsistent coordinates for tooltips and overlays in older engines).
2. **Header**: scales with the table (as in the mockup), so FR-002's 695x630 px follows from 992x900 x 0.7. Other screens are not scaled (service `enabled` is false there).
3. **Minimum width**: no separate rule; portrait tablets (768x1024, scale 0.77) still show the table. Closes the open decision in the spec assumptions.
4. **Resize without restart**: the table stays mounted below the minimum and is only hidden (`hidden`/`display: none`) behind the blocking hint, so animation and timers keep running (FR-007).
5. **Notice dismissal**: in-memory signal in the service, reset on reload ("per visit").
6. **Dialogs, toasts, tooltips**: rendered by PrimeNG outside the stage (`appendTo` body), therefore unscaled; verified in quickstart.
7. **Accessibility**: one global `:focus-visible` rule (3 px outline, 2 px offset, `--p-primary-color`, contrast checked in both themes) replacing component-specific rings where needed; tab order verified on the real DOM and fixed only where measured wrong; seat cards stay non-focusable.
8. **Minimum scale 0.7**: confirmed after checking the smallest text at 1024x640 in the quickstart; if it fails, change the constant and record it in the spec.

## Complexity Tracking

No violations.
