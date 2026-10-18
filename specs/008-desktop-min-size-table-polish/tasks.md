---
description: 'Task list for 008 Desktop Minimum Size and Table Polish'
---

# Tasks: Desktop Minimum Size and Table Polish

**Input**: Design documents from `/specs/008-desktop-min-size-table-polish/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-contract.md](contracts/ui-contract.md), [quickstart.md](quickstart.md)

**Tests**: Included for new logic (constitution III): unit tests in the same change. Layout, focus and contrast are verified with throw-away Playwright scripts (skill `verify-ui`), not a permanent suite.

**Organization**: Grouped by user story. Frontend only; all paths are under `apps/frontend/src/` unless noted.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task)
- **[Story]**: US1 scale, US2 hints, US3 keyboard and focus, US4 contrast and text fit

---

## Phase 1: Setup

- [x] T001 Run the baseline once more with a throw-away Playwright script (skill `verify-ui`, keep it in the scratchpad, not in the repo) and record tab order, focus ring width and the fixed 44 rem board at 1024x640 for later comparison; note results in the PR description draft only

---

## Phase 2: Foundational (blocks all stories)

- [x] T002 Create `app/core/table-scale.ts` with constants `STAGE_WIDTH = 992`, `STAGE_HEIGHT = 900`, `MIN_SCALE = 0.7`, the pure function `computeScale(width, height)` returning `min(1, width/992, height/900)`, and a `modeFor(scale)` returning `'full'` (scale >= 1), `'scaled'` (`0.7 <= scale < 1`) or `'blocked'` (scale < 0.7), plus derived minimum size `ceil(992 * 0.7) x ceil(900 * 0.7)` = 695 x 630
- [x] T003 Add the root `TableScale` service in `app/core/table-scale.ts`: signals `viewport` (from `window.innerWidth/innerHeight`, updated by an rAF-throttled `resize` listener removed on destroy), `enabled` (default false, set via `enable()` / `disable()`), `dismissed` (set by `dismiss()`, never reset, not persisted), computed `scale` (`enabled ? computeScale(...) : 1`) and `mode` (per data-model.md)
- [x] T004 [P] Unit tests in `app/core/table-scale.spec.ts`: 1920x950 gives 1.0 and `full`; 2560x1440 stays 1.0; 1024x640 about 0.71 and `scaled`; 1366x650 is limited by height; 694x900 and 1200x629 are `blocked`; disabled service always reports 1 and `full`; `dismissed` stays true after resize; listener is removed on destroy
- [x] T005 [P] Add EN keys in `app/i18n/en.ts` and DE keys in `app/i18n/de.ts`: `scale.notice` ("Table scaled to fit your window ({percent}%)."), `scale.dismiss`, `scale.tooSmall.title`, `scale.tooSmall.body` (placeholders `{width}`, `{height}`, `{currentWidth}`, `{currentHeight}`), `scale.tooSmall.running` per [contracts/ui-contract.md](contracts/ui-contract.md); `app/i18n/i18n.spec.ts` must stay green (key parity)

**Checkpoint**: scale math and strings exist and are tested.

---

## Phase 3: User Story 1 - The whole play area fits and scales (Priority: P1)

**Goal**: header and table are one 992x900 stage scaled uniformly to the viewport; the whole play area is visible without scrolling from 695x630 up, never enlarged beyond 1.0.

**Independent Test**: [quickstart.md](quickstart.md) section 2 (measurement table) and section 3 steps 1-2.

- [x] T006 [US1] In `app/table/table.ts` call `TableScale.enable()` when the table is created and `disable()` on destroy (use `DestroyRef`/`ngOnDestroy`); the table component itself is not changed otherwise
- [x] T007 [US1] In `app/app.ts` inject `TableScale` (protected readonly) and in `app/app.html` wrap the header, connection message and `<main>` in `<div class="vl-stage">` containing `<div class="vl-stage-inner">`; bind outer size and inner transform via style bindings only while `scale() < 1`: outer `width: 992*s px; height: 900*s px`, inner `width: 992px; min-height: 900px; transform: scale(s)`; for scale 1 or a disabled service render no extra sizing so other screens are unchanged (FR: other screens keep behaviour)
- [x] T008 [US1] In `styles.css` add `.vl-stage` (centred with `margin-inline: auto`, `overflow: hidden` only on the outer box when scaled) and `.vl-stage-inner` (`transform-origin: top left`); when scaled, `.vl-main` must not apply its `max-width: 64rem` / side padding in a way that changes the 992 px stage width (check `.vl-main` and `.vl-board { min-width: 52rem }` fit exactly 992 px; adjust paddings, not the board size, so the oval and seat columns keep their positions: columns at x=8 and x=832, rows 144/318/492/666 for 8 players)
- [x] T009 [US1] Ensure the stage never causes horizontal scroll (FR-004): the outer box is sized to the scaled width, `body` has no overflow at 1024 px with a visible scrollbar; fix in `styles.css` if the measurement shows any
- [x] T010 [P] [US1] Component test in `app/app.spec.ts`: with `TableScale.enabled` and a mocked viewport of 1280x650, the stage inner element has `transform: scale(0.72...)` and the outer box height is about 650 px; with viewport 1920x950 or a disabled service no transform is applied
- [x] T011 [US1] Verify with a throw-away Playwright script (quickstart section 2): 3 viewports x 4 phases x 3 player counts, every play-area element ends at or above the viewport bottom, relative positions differ by at most 1% between sizes (SC-001, SC-002), wide-flat 1366x650 is centred with margins; paste the result table into the PR description

**Checkpoint**: US1 works alone (no notice or hint yet; below 0.7 the table simply keeps scale 0.7 behaviour until US2).

---

## Phase 4: User Story 2 - Clear hints (Priority: P2)

**Goal**: dismissible notice between 0.7 and 1; blocking hint below 0.7; table stays mounted so nothing restarts.

**Independent Test**: [quickstart.md](quickstart.md) section 3.

- [x] T012 [P] [US2] Create `app/shared/scale-notice.ts` (standalone component): pill with text `scale.notice` (`percent` = `round(scale*100)`) and a dismiss button (`scale.dismiss`, accessible name, min 44 px target not scaled) calling `TableScale.dismiss()`; `role="status"`; rendered unscaled in the empty header band outside `.vl-stage-inner`, positioned so it never covers play-area elements
- [x] T013 [P] [US2] Create `app/shared/window-too-small.ts` (standalone component): heading `scale.tooSmall.title`, body `scale.tooSmall.body` with required 695 x 630 (from `TableScale` constants) and current viewport size, line `scale.tooSmall.running`; centred, unscaled
- [x] T014 [US2] In `app/app.html` render the notice when `mode() === 'scaled' && !dismissed()` and the hint when `mode() === 'blocked'`; while blocked, hide the stage with the `hidden` attribute / `display: none` (never `@if`) so `Table` stays mounted and dice animation, bust timer and turn timer are not restarted (FR-007); dialogs and toasts stay outside the stage
- [x] T015 [P] [US2] Unit tests `app/shared/scale-notice.spec.ts` and `app/shared/window-too-small.spec.ts`: text in EN and DE, percent rounding, dismiss hides the notice and it stays hidden after a resize, hint shows required and current size
- [x] T016 [US2] Extend `app/app.spec.ts`: shrinking the mocked viewport below 695x630 shows the hint and keeps the table element in the DOM (same instance), enlarging restores it; notice not shown at scale 1 and after dismissal
- [x] T017 [US2] Verify per quickstart section 3 (steps 1-5, including browser zoom 125% / 150% and the 1 s limit of SC-004) with a throw-away script; confirm tooltips, settings and leave dialogs and toasts still sit inside the window while scaled

**Checkpoint**: US1 and US2 complete the scaling feature.

---

## Phase 5: User Story 3 - Keyboard operation and visible focus (Priority: P2)

**Goal**: thick visible focus on every control in both themes, tab order header, table controls, log; no seat tab stops; full turn by keyboard.

**Independent Test**: [quickstart.md](quickstart.md) section 4.

- [x] T018 [US3] (result: tab order already header, controls, log; no wrong order reproduced) Reproduce the tab-order finding with a throw-away Playwright tab-through at 1024x640 (record the order of focused elements) and identify the cause (DOM order in `app/table/table.ts`, `app/table/table-layout.ts` seat order, stray `tabindex`, PrimeNG internals); document the cause in the PR description
- [x] T019 [US3] (no fix needed, seat cards have no tab stop) Fix the tab order at the cause found in T018 so it is header, table controls (leave, settings, draw, dice, actions), then log; no positive `tabindex`; seat cards in `app/table/player-seat.ts` get no tabindex and no focusable children
- [x] T020 [P] [US3] In `styles.css` add one global rule `:focus-visible { outline: 3px solid var(--p-primary-color); outline-offset: 2px; }` covering buttons, links, selects, dice (keep `shared/dice-tile.ts` consistent) and PrimeNG buttons; remove conflicting weaker rules; if the primary colour has too little contrast on a filled button or on the dark background add an inner ring (`box-shadow: 0 0 0 2px var(--vl-bg)`); make the ring 4 px if it renders under 2 px at scale 0.7 (FR-008)
- [x] T021 [P] [US3] Component test in `app/table/table.spec.ts` (or `player-seat.spec.ts`): seat cards contain no focusable element and no `tabindex`; DOM order places leave/settings and turn controls before the log section
- [x] T022 [US3] Verify per quickstart section 4: tab-through at 1024x640 and 1920x950, light and dark, EN and DE; play one complete turn (draw, throw, select, set aside, bank) with the keyboard only; measure the ring contrast against its background (at least 3:1)

---

## Phase 6: User Story 4 - Contrast and language checks (Priority: P3)

**Goal**: regression check of contrast and text fit after the layout change.

**Independent Test**: [quickstart.md](quickstart.md) section 5.

- [x] T023 [US4] Measure contrast of body text, state markers and icons in light and dark theme (script computing ratios from computed styles) for 2, 4, 8 players; body text must stay at 8.6:1 or better, non-text markers must not rely on colour alone; fix tokens in `app/theme/terracotta-preset.ts` or `styles.css` only where a check fails
- [x] T024 [US4] Check text fit at scale 0.7 in EN and DE: no label cut off or overlapping, including the longest Secured-area texts for Street, Star, Clover and "Double Lotte" (`app/table/dice-area.ts`, `app/i18n/de.ts`); fix wrapping or widths where needed without changing positions
- [x] T025 [US4] Judge readability of the smallest text (log 0.75 rem, seat captions, card captions) at 1024x640; if unreadable either raise the smallest sizes in the reference size or raise `MIN_SCALE` in `app/core/table-scale.ts`; record the final value in spec.md (FR-002, Assumptions) and `docs/roadmap.md`
- [x] T026 [US4] Repeat the spec 007 quickstart walk-through ([specs/007-active-game-table-ui/quickstart.md](../007-active-game-table-ui/quickstart.md)) at 1024 px and wider for 2, 4, 8 players, both themes and languages: no overlap, no cut-off, no horizontal scroll (SC-006); confirm the earlier "seats cut off at 1024 px" finding does not occur

---

## Phase 7: Polish and cross-cutting

- [x] T027 Run `npm run lint && npm run typecheck && npm run test` and `npm run build`; fix findings; check coverage of the new files against `.specify/memory/test-coverage-guide.md` (template-only components may be skipped and mirrored in `sonar.coverage.exclusions`)
- [ ] T028 Manual smoke test of one complete game (lobby, play, bust, bank, reconnect) at 1024x640 and 1920x950, no regression against v0.0.5 (SC-007, FR-013)
- [x] T029 Update `docs/roadmap.md`: move R1 to Done with a one-line result and the final minimum size; add the decision "no separate minimum width" and the open item for screen-reader support (timers) as an idea; update spec.md status
- [ ] T030 Run `/speckit-sonar-local` and `/speckit-sonar-validate`; fix issues on the new code

---

## Dependencies and order

- Phase 1 first (baseline), Phase 2 blocks everything.
- US1 (T006-T011) is the MVP. US2 (T012-T017) needs US1 (stage markup in `app.html`). US3 (T018-T022) is independent of US1/US2 and can run in parallel after Phase 2; T019 depends on T018. US4 (T023-T026) should run after US1 because scale 0.7 is its test condition; T025 may change `MIN_SCALE` and therefore must precede final verification of US2 (T017).
- Phase 7 last.

## Parallel examples

- After Phase 2: US1 (T006-T009) and US3 (T018, T020, T021) in parallel.
- Within US2: T012, T013, T015 touch separate files.
- Within Phase 2: T004 and T005.

## Implementation strategy

1. MVP: Phase 1, 2, then US1; stop and validate the measurement table.
2. Add US2 for the hints, then US3 and US4, verifying each independently with the quickstart sections.
3. Finish with Polish, smoke test, docs and Sonar.
