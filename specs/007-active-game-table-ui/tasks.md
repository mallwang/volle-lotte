# Tasks: Active Game Table UI

**Input**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [research.md](research.md), [contracts/components.md](contracts/components.md), [design.md](design.md), [mockup.html](mockup.html)

**Tests**: Included. Constitution III requires ≥ 80% coverage and the plan gives every component and pure helper a spec. Existing `table.spec.ts` must keep passing (SC-005).

**Paths**: all under `apps/frontend/src/` (abbreviated `app/` = `apps/frontend/src/app/`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on incomplete tasks)
- Components are standalone, signal `input()`/`output()`, presentational; `Table` keeps all state (see research.md).

---

## Phase 1: Setup

- [x] T001 Read `specs/007-active-game-table-ui/design.md` and `mockup.html` and note the CSS (felt, grid areas, seat, pile, card) to port into `apps/frontend/src/styles.css`; read `app/table/table.ts`, `app/table/table.spec.ts`, `app/shared/player-tile.ts`, `app/shared/card-tile.ts`, `app/shared/tiles.spec.ts` to know the current template, state and tests (no file changes)

---

## Phase 2: Foundational (blocks all stories)

**Purpose**: pure view-model helpers and shared i18n keys used by every story.

- [x] T002 [P] Create pure helpers in `app/core/table-view.ts` per data-model.md: `SeatArea`, `seatAreas(count)` (own seat first: l1, r1, l2, r2, ... for 1–8 players), `totalCards(rules)`, `playedCards(total, deckSize, hasActive)`, `PileLevel`, `pileLevel(deckSize, total)` (empty = 0; few ≤ 1/6; medium ≤ 1/2; else many), `discardLayers(played)` (`min(8, ceil(played/6))`), `layerTransform(i)`, plus `seatViews` that rotates players in turn order starting at `you.seat`
- [x] T003 [P] Create `app/core/table-view.spec.ts` (no TestBed): seat areas for every count 1–8 (no duplicates, starts at `l1`, 8 = 4 per column), rotation from any `you.seat`, pile level thresholds incl. 0 and after reshuffle, played clamp at 0, layers 0/1/8 cap, `layerTransform` determinism
- [x] T004 [P] Add new i18n keys to `app/i18n/en.ts` and `app/i18n/de.ts` (seat accessible name parts: you/active/offline/human/computer, "players" list label, pile levels many/medium/few/empty, draw/discard pile labels with counts, empty card slot); run the existing i18n parity spec

**Checkpoint**: helpers tested, keys present.

---

## Phase 3: User Story 1 - Players around the table (P1) 🎯 MVP

**Goal**: seat cards on an oval table, own seat top left, turn order alternating right and left, active seat with timer.

**Independent Test**: games with 2, 4, 8 players: positions, own/active highlight, timer only in the active seat, offline marker.

- [x] T005 [P] [US1] Add board/felt/grid-area/seat styles (tokens only, no hard-coded colours, focus ring, not-colour-alone markers) to `apps/frontend/src/styles.css`
- [x] T006 [P] [US1] Create `app/table/player-seat.ts` (`PlayerSeat`: inputs `name`, `score`, `computer`, `online`, `active`, `you`, `deadlineAt?`; human/computer icon, truncated name with full name as title/accessible name, "you" and "active" labels/icons, offline state; embeds existing `TurnTimer` only when `deadlineAt` set; `aria-label` with name, score, kind, states)
- [x] T007 [P] [US1] Create `app/table/table-layout.ts` (`TableLayout`: input `areas`; content slots for seats (ordered list, DOM order = turn order) and centre; oval felt; side columns with grid areas `l1..l4` / `r1..r4` around the centre)
- [x] T008 [P] [US1] Create `app/table/player-seat.spec.ts` (renders name/score/icon, you+active distinguishable, offline, timer only when `deadlineAt`, accessible name)
- [x] T009 [P] [US1] Create `app/table/table-layout.spec.ts` (area class per seat for 2/4/8, projected centre content)
- [x] T010 [US1] Update `app/table/table.ts`: replace the player list and the textual active-player/target lines with `TableLayout` + `PlayerSeat` (use `seatViews`; keep target score visible; keep timer condition: hidden while rolling or showing a bust; announce active player via existing live region); remove the separate turn-timer placement
- [x] T011 [US1] Update `app/table/table.spec.ts` for the new seat markup (own seat first/top left, active seat contains the timer, offline marker); keep all other cases green
- [x] T012 [US1] Delete `app/shared/player-tile.ts` and its cases in `app/shared/tiles.spec.ts` if nothing else uses it (grep first)

**Checkpoint**: US1 works alone with the old dice/log/card markup in the centre.

---

## Phase 4: User Story 2 - Cards and piles in the centre (P1)

**Goal**: CSS card, draw pile with count + level, untidy discard pile.

**Independent Test**: play turns; draw pile count/level change, discard grows without jumping; theme/language switch updates the card.

- [x] T013 [P] [US2] Add card/pile/discard-layer styles to `apps/frontend/src/styles.css` (2:3 via `aspect-ratio`, tokens only, contrast pairs pass the existing contrast test, no new animation)
- [x] T014 [P] [US2] Create `app/shared/game-card.ts` (`GameCard`: input `card: CardType | null`; type icon (PrimeIcons), value text, localized name from `card.<type>`; empty slot when null; accessible name)
- [x] T015 [P] [US2] Create `app/table/card-deck.ts` (`CardDeck`: inputs `size`, `total`; layers by `pileLevel` (0/2/4/6), count always as text, accessible label with level)
- [x] T016 [P] [US2] Create `app/table/discard-pile.ts` (`DiscardPile`: input `played`; `discardLayers` + `layerTransform` for stable jitter; nothing when 0; accessible label with count)
- [x] T017 [P] [US2] Create `app/shared/game-card.spec.ts` (value, name per language, null → empty slot)
- [x] T018 [P] [US2] Create `app/table/card-deck.spec.ts` (count text, each level incl. empty)
- [x] T019 [P] [US2] Create `app/table/discard-pile.spec.ts` (0 → none, layer count grows and caps at 8, same transforms on re-render)
- [x] T020 [US2] Update `app/table/table.ts`: put `GameCard`, `CardDeck`, `DiscardPile` into the `TableLayout` centre slot; compute `total = totalCards(rules)` and `played = playedCards(...)` via `computed`; drop the textual deck line (count now in `CardDeck`)
- [x] T021 [US2] Update `app/table/table.spec.ts` (card shown after draw, deck count, discard grows, reshuffle refills deck / shrinks discard)
- [x] T022 [US2] Remove `app/shared/card-tile.ts` and its cases in `app/shared/tiles.spec.ts` if nothing else uses it (grep first)

**Checkpoint**: US1 + US2 work; dice area and log still old markup.

---

## Phase 5: User Story 3 - Dice, secured area, actions, log (P2)

**Goal**: regroup into standalone components with unchanged behaviour.

**Independent Test**: full turn (draw, throw, select, bank) and a bust; computer turn; long log scrolls inside its panel.

- [x] T023 [P] [US3] Add dice-area/secured/log panel styles to `apps/frontend/src/styles.css` (log scrolls inside its panel, table does not move)
- [x] T024 [P] [US3] Create `app/table/dice-area.ts` (`DiceArea`: inputs per contracts/components.md: `dice`, `selected`, `rolling`, `bust`, `canSelect`, `computerPick`, action state/callbacks, secured data (street, groups, carried), min-points hint, disabled reasons; output `toggled(index)`); move markup only, logic stays in `Table`; keep existing `aria-label`s and `role="status"`
- [x] T025 [P] [US3] Create `app/table/game-log.ts` (`GameLog`: inputs `entries`, text renderer; `role="log"`, scrolls inside its panel)
- [x] T026 [P] [US3] Create `app/table/dice-area.spec.ts` (toggle output, disabled when not `canSelect`, bust display, computer-pick highlight, Street progress)
- [x] T027 [P] [US3] Create `app/table/game-log.spec.ts` (renders entries, `role="log"`)
- [x] T028 [US3] Update `app/table/table.ts`: replace the dice/secured/actions/log markup with `DiceArea` and `GameLog`; `Table` stays the thin container (state, roll/bust, log reveal, dialogs, leave/settings); target ~150–250 lines
- [x] T029 [US3] Run `table.spec.ts` unchanged for turn behaviour (draw, throw, select, bank, bust countdown, computer thinking hint); fix regressions in the components, not by loosening tests

**Checkpoint**: all stories complete.

---

## Phase 6: Polish

- [x] T030 Check component style budgets (4kb warn / 8kb error) with `npm run build`; move shared rules into `styles.css` if exceeded
- [x] T031 [P] Verify keyboard order (turn order), visible focus, contrast in light/dark and EN/DE per quickstart.md; fix gaps (moved to spec 008: gaps depend on the minimum size, see roadmap R1)
- [x] T032 [P] Update `docs/migration.md` (frontend table structure) if it describes the old `Table`/tiles
- [x] T033 Run `npm run typecheck && npm run lint && npm run test` (coverage ≥ 80%), then the quickstart.md manual walk-through at 1024 px and wider for 2, 4, 8 players (moved to spec 008: walk-through follows the minimum-size work, see roadmap R1)

---

## Dependencies & Order

- Phase 1 → Phase 2 → stories. T010, T020, T028 all edit `table.ts` and are sequential: US1 → US2 → US3.
- US2 component work (T013–T019) can start in parallel with US1 after Phase 2; only T020+ needs T010.
- US3 components (T023–T027) are independent of US1/US2 until T028.
- Polish after all stories.

## Parallel Examples

```text
After Phase 2:  T005 T006 T007 T008 T009  (US1 components + specs)
                T013 T014 T015 T016 T017 T018 T019  (US2 components + specs)
                T023 T024 T025 T026 T027  (US3 components + specs)
```

## Strategy

- **MVP**: Phases 1–3 (US1): seats around the table. Validate with 2/4/8 players before continuing.
- Then US2 (piles), then US3 (regroup); each increment keeps `table.spec.ts` green.
