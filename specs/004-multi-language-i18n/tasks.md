# Tasks: Multi-language support (i18n)

**Input**: Design documents from `/specs/004-multi-language-i18n/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/i18n-ui-contract.md](contracts/i18n-ui-contract.md), [design.md](design.md)

**Tests**: Unit tests are included (constitution coverage target; plan lists service, parity and select tests).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependencies)
- Paths are relative to the repository root; frontend root is `apps/frontend/src/app/`

---

## Phase 1: Setup

- [x] T001 Create dictionary files `apps/frontend/src/app/i18n/en.ts` (exports `en` as `const` object, flat keys, `{param}` placeholders; start with the nickname screen and `error.*` keys) and `apps/frontend/src/app/i18n/de.ts` (typed as `Record<keyof typeof en, string>`)

---

## Phase 2: Foundational (blocks all stories)

**⚠️ CRITICAL**: No user story can start before this phase is complete.

- [x] T002 Implement `I18nService` in `apps/frontend/src/app/core/i18n.service.ts` per [contracts/i18n-ui-contract.md](contracts/i18n-ui-contract.md): `languages` list (code/name/flag), `lang` signal, `t(key, params?)` with English then key fallback, `{param}` interpolation, `effect` setting `document.documentElement.lang`; initial language `en` for now (detection and persistence come in US1/US3)
- [x] T003 [P] Implement `t` pipe in `apps/frontend/src/app/core/translate.pipe.ts` (standalone, `pure: false` or reading `lang()` so it re-evaluates on switch)
- [x] T004 [P] Add `I18nService` unit tests in `apps/frontend/src/app/core/i18n.service.spec.ts`: interpolation, English fallback for a missing key, key fallback, `<html lang>` updates
- [x] T005 [P] Add dictionary parity test in `apps/frontend/src/app/i18n/i18n.spec.ts`: `de` and `en` have identical key sets and identical `{placeholders}` per key

**Checkpoint**: Service, pipe and dictionaries are ready.

---

## Phase 3: User Story 1 - App follows my browser language (P1) 🎯 MVP

**Goal**: First visit uses German for German browsers (incl. regional variants), English otherwise, on every screen.

**Independent Test**: Browser set to `de-AT` → German UI; set to `fr` → English UI (see [quickstart.md](../004-multi-language-i18n/quickstart.md) step 1).

- [x] T006 [US1] Add browser detection to `apps/frontend/src/app/core/i18n.service.ts`: first entry of `navigator.languages` (then `navigator.language`) whose base language (`de-AT` → `de`) is supported, else `en`
- [x] T007 [P] [US1] Extract texts and use `t` pipe/`i18n.t()` in `apps/frontend/src/app/nickname/nickname.ts`; add keys to `en.ts`/`de.ts`
- [x] T008 [P] [US1] Same for `apps/frontend/src/app/lobby/lobby.ts`
- [x] T009 [P] [US1] Same for `apps/frontend/src/app/create-game/create-game.ts`
- [x] T010 [P] [US1] Same for `apps/frontend/src/app/game-lobby/game-lobby.ts`
- [x] T011 [P] [US1] Same for `apps/frontend/src/app/game/game.ts` and `apps/frontend/src/app/table/table.ts` (including toasts raised there)
- [x] T012 [P] [US1] Same for `apps/frontend/src/app/table/disconnect-banner.ts` and `apps/frontend/src/app/result/result.ts`
- [x] T013 [P] [US1] Same for `apps/frontend/src/app/shared/card-tile.ts`, `dice-tile.ts`, `player-tile.ts` (including aria labels)
- [x] T014 [P] [US1] Same for `apps/frontend/src/app/app.html` (nav, header, theme selector label and `Light/Dark/System` mode labels in `app.ts`)
- [x] T015 [US1] Translate backend reason codes (FR-008): change `apps/frontend/src/app/core/error-message.ts` to map `ErrorReason` to `error.<reason>` keys via `I18nService` with params for `attemptsLeft`, `retryAfterMs` (seconds) and `engine`; add German texts; update existing callers (`socket.service.ts`, specs) accordingly
- [x] T016 [US1] Add detection tests to `apps/frontend/src/app/core/i18n.service.spec.ts` (`de-AT`, `fr`, list order) and fix existing component specs that assert English text so they run with `en`

**Checkpoint**: All screens render from dictionaries; browser language selects the initial language.

---

## Phase 4: User Story 2 - Switch language manually (P1)

**Goal**: Language select with flags next to the theme selector, instant switching, accessible.

**Independent Test**: Switch on every screen with mouse and keyboard; state is kept; names announced ([quickstart.md](quickstart.md) steps 2 and 5).

- [x] T017 [US2] Add `set(code)` to `apps/frontend/src/app/core/i18n.service.ts` (ignores unsupported codes)
- [x] T018 [US2] Add the language `p-select` to `apps/frontend/src/app/app.html` left of the theme selector and wire it in `apps/frontend/src/app/app.ts` (import `SelectModule`, `FormsModule` binding to `i18n.lang()`/`i18n.set()`): flag `aria-hidden` plus native name, accessible name via translated `ariaLabel`, flag only on narrow viewports with name kept for assistive tech (per [design.md](design.md))
- [x] T019 [P] [US2] Add key `language.label` ("Language"/"Sprache") to `apps/frontend/src/app/i18n/en.ts` and `de.ts`
- [x] T020 [US2] Add component test in `apps/frontend/src/app/app.spec.ts` (create if missing): switching changes visible text without reload and keeps router/socket state; select has accessible name

**Checkpoint**: Manual switching works everywhere.

---

## Phase 5: User Story 3 - My choice is remembered (P2)

**Goal**: Stored choice beats browser language; robust against invalid values and blocked storage.

**Independent Test**: [quickstart.md](quickstart.md) steps 3 and 4.

- [x] T021 [US3] In `apps/frontend/src/app/core/i18n.service.ts` read `vl-language` first (valid codes only, try/catch) and write it in `set()` (try/catch), mirroring `apps/frontend/src/app/core/theme.service.ts`; export `LANGUAGE_KEY`
- [x] T022 [US3] Add tests to `apps/frontend/src/app/core/i18n.service.spec.ts`: stored value wins over browser, invalid value ignored, throwing `localStorage` does not break `set()` or init

**Checkpoint**: Persistence verified.

---

## Phase 6: User Story 4 - Bilingual documentation (P2)

**Goal**: README and user guide exist in English and German with equal structure.

**Independent Test**: Headings of each pair match; links between languages work ([quickstart.md](quickstart.md) step 7).

- [x] T023 [P] [US4] Create `docs/user-guide.md` (English; how to join/create a game, play, change language and theme, FAQ) modelled on `~/projects/github/vaultfolio/docs/user-guide.md`, content based on `docs/rules.md` and the real UI
- [x] T024 [P] [US4] Create `docs/user-guide.de.md` (German, same headings/sections as T023)
- [x] T025 [P] [US4] Create `README.de.md` as German equivalent of `README.md` (same sections), modelled on Vaultfolio's `README.de.md`
- [x] T026 [US4] Add language switch links (English ↔ German) at the top of `README.md` and `README.de.md`, and link both user guides from both READMEs and between the guides
- [x] T027 [US4] Mention the language selection in `README.md`/`README.de.md` feature list

---

## Phase 7: User Story 5 - Docs skill supports bilingual docs (P3)

**Goal**: The docs skill updates language pairs together.

**Independent Test**: Read the skill: scope list and impact table name all three pairs.

- [x] T028 [US5] Update `.claude/skills/speckit-docs-update/SKILL.md`: add `/README.de.md`, `/docs/user-guide.md`, `/docs/user-guide.de.md` to the scope list; add impact-table rows for README/user-guide pairs with "always update both language versions together"; mention the pairs in the delta step (copy the wording from `~/projects/github/vaultfolio/.claude/skills/speckit-docs-update/SKILL.md`)

---

## Phase 8: Polish

- [x] T029 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and fix findings
- [x] T030 Walk through [quickstart.md](quickstart.md) in the browser (both languages, all screens) and verify no raw keys or mixed-language screens (SC-001)
- [x] T031 [P] Run `/speckit-docs-update` to align `docs/migration.md` and README with the new feature

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. US1 first (MVP); US2 and US3 both extend `i18n.service.ts`, so do them after US1 and sequentially (US2 → US3) to avoid file conflicts. US4 and US5 are independent of code and can run in parallel with any story once US2 exists (the guides describe the select).
- Within US1, T007–T014 touch different files and run in parallel after T006; T015 and T016 follow.
- Polish after all stories.

## Parallel Example: User Story 1

```text
T007 nickname.ts | T008 lobby.ts | T009 create-game.ts | T010 game-lobby.ts
T011 game.ts+table.ts | T012 disconnect-banner.ts+result.ts | T013 shared tiles | T014 app.html
```

## Implementation Strategy

1. MVP: Phases 1–3 (browser language, all texts translatable).
2. Add US2 (select), then US3 (persistence) — together they complete the user-facing feature.
3. Add US4/US5 docs, then Polish.

## Notes

- Keep English as the source dictionary; every new key goes into both files (parity test enforces it).
- No new dependencies (Constitution VII, see research.md).
