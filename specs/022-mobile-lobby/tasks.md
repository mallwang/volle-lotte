---
description: 'Task list for Mobile lobby and game setup'
---

# Tasks: Mobile lobby and game setup

**Input**: Design documents from `/specs/022-mobile-lobby/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/socket-intents.md, design.md (approved mockup)

**Tests**: Unit tests accompany each new component and service (plan, constitution III: 80 % coverage). Moved specs keep their expectations unchanged (SC-005).

**Organization**: Grouped by user story. US1-US3 are P1, US4 is the P2 cross-cutting quality bar.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1-US4

## Path Conventions

- Shared lib: `libs/client-core/src/`
- Mobile app: `apps/mobile/src/app/`
- Desktop app (import paths only): `apps/frontend/src/app/`

## Phase 1: Setup (shared lib `client-core`)

**Purpose**: Move the pure setup model and translations into a `scope:shared` lib so mobile can use them (research R1).

- [x] T001 Scaffold `libs/client-core` by copying the layout of `libs/computer-names` (`package.json` with name `client-core` and `nx.tags ["scope:shared"]`, `eslint.config.mjs`, `tsconfig*.json`, `.spec.swcrc`, `jest.config.cts`, `src/index.ts`), and register it in the npm workspace (`npm install`)
- [x] T002 Move `apps/frontend/src/app/core/setup.ts` and `setup.spec.ts` to `libs/client-core/src/lib/` with `git mv`, export from `libs/client-core/src/index.ts`
- [x] T003 Move `apps/frontend/src/app/i18n/en.ts`, `de.ts`, `i18n.spec.ts` to `libs/client-core/src/lib/i18n/` with `git mv`, export from `libs/client-core/src/index.ts`
- [x] T004 Update desktop imports to `client-core` in `apps/frontend/src/app/core/i18n.service.ts`, `setup-store.ts`, `setup-apply.ts`, `create-game/create-game.ts`, `game-lobby/game-lobby.ts`, `game-lobby/start-question-dialog.ts`, `shared/preset-bar.ts`, `shared/preset-list-dialog.ts`, `shared/preset-save-dialog.ts` and their specs (`setup-store.spec.ts`, `create-game.spec.ts`, `game-lobby.spec.ts`, `start-question-dialog.spec.ts`, `preset-*.spec.ts`); add `client-core` as dependency in `apps/frontend/package.json` and `apps/mobile/package.json` if the other libs are listed there
- [x] T005 Run `npx nx run-many -t lint,typecheck,test -p client-core,frontend` and confirm desktop expectations are untouched (SC-005)

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Mobile socket/session service, i18n, routing and shared styling that every screen needs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Grow `apps/mobile/src/app/core/mobile-connection.service.ts` into `MobileSocketService` (keep `MOBILE_SOCKET`, `online`): add `session`, `games`, `game` signals, `send()` with the offline refusal, session persistence under `volle-lotte.session`, `session:start`/`lobby:list` on connect, and the pushes `lobby:games`, `game:snapshot`, `game:change` (with `game:sync` on gap), `game:settingsChanged`, `game:closed`, `session:replaced` (contracts/socket-intents.md, data-model.md); rename file to `mobile-socket.service.ts` and update `app.ts`
- [x] T007 [P] Add a fake-socket test helper and service spec in `apps/mobile/src/app/core/mobile-socket.service.spec.ts` (session resume, list push, game change with gap, replaced, offline refusal)
- [x] T008 [P] Create `apps/mobile/src/app/i18n/mobile-en.ts` and `mobile-de.ts` (mobile-only keys, German with generic masculine) and `apps/mobile/src/app/core/i18n.service.ts` plus `translate.pipe.ts` merging them over the `client-core` dictionaries; spec with key parity test in `apps/mobile/src/app/i18n/mobile-i18n.spec.ts`
- [x] T009 [P] Create `apps/mobile/src/app/core/session.guard.ts` (+ spec): redirect to `nickname` without a session; helper for the "membership in game" guard on `game/:id`
- [x] T010 [P] Replace the stylesheet in `apps/mobile/src/styles.css` with terracotta theme variables, 44 px touch targets, no horizontal overflow, fixed action-bar and card-grid rules (one column portrait, two landscape) per design.md
- [x] T011 Define routes in `apps/mobile/src/app/app.routes.ts` (`''`, `nickname`, `create`, `game/:id`, `started`, `**` → ``), wire `provideRouter(routes)` in `apps/mobile/src/main.ts`, and update `apps/mobile/src/app/app.ts` to a `<router-outlet>` shell with an offline banner; update `app.spec.ts`

**Checkpoint**: Mobile app boots, connects, routes; no screens yet.

---

## Phase 3: User Story 1 - Sign in and browse games on a phone (Priority: P1) 🎯 MVP

**Goal**: Nickname entry, session persistence, live game list.

**Independent Test**: Open `/m/` on a phone-sized viewport, enter a nickname, see the list with name, host, target score, seats, protection and status; empty state and create action shown (quickstart scenario 1).

- [x] T012 [P] [US1] Nickname screen in `apps/mobile/src/app/nickname/nickname.ts` (+ `nickname.spec.ts`): native input, same validation and error messages as desktop, submit via `session:start`, navigate to list
- [x] T013 [P] [US1] Game list in `apps/mobile/src/app/list/list.ts` (+ `list.spec.ts`): cards, status chips, only applicable actions (no join on full game, banned notice, running games status only), empty state, create button
- [x] T014 [US1] Wire nickname redirect for stored sessions and the guard in `apps/mobile/src/app/app.routes.ts`; verify returning-user flow in the specs

**Checkpoint**: US1 is demoable alone.

---

## Phase 4: User Story 2 - Create a game and get ready (Priority: P1)

**Goal**: Create a game, host lobby with seats, computers, settings, ready, start.

**Independent Test**: Create a game with name and optional password, change settings, add a computer, ready up, start when conditions are met (quickstart scenario 2).

- [x] T015 [P] [US2] Create-game form in `apps/mobile/src/app/create-game/create-game.ts` (+ spec): name, password, seats, rules, computer options using `client-core` setup model; fixed Cancel/Create bar; values kept on rotation; `game:create` then navigate to `game/:id`
- [x] T016 [US2] Lobby in `apps/mobile/src/app/game-lobby/game-lobby.ts` (+ spec): seat list with ready, lock and host markers, ready/withdraw, leave, host controls (add/remove computer, difficulty and risk, lock, remove player, collapsible `<details>` settings via `game:settings`), start with the same confirmation as desktop, fixed action bar, two columns in landscape
- [x] T017 [US2] Handle removal by host, host change notice and `game:closed` in `game-lobby.ts` (return to list with explanation), and the `game/:id` membership guard in `apps/mobile/src/app/app.routes.ts`

**Checkpoint**: US1 and US2 work; hosting from a phone is possible.

---

## Phase 5: User Story 3 - Join a game hosted by someone else (Priority: P1)

**Goal**: Join (with password), guest lobby read-only, started notice.

**Independent Test**: Host on desktop, join from phone (password if protected), ready; desktop shows the phone seated and ready (quickstart scenarios 3 and 5).

- [x] T018 [P] [US3] Join dialog in `apps/mobile/src/app/join-dialog/join-dialog.ts` (+ spec): native `<dialog>`, bottom sheet portrait and centred landscape, password field, wrong password, lockout, full and closed errors with return to list
- [x] T019 [P] [US3] Started notice in `apps/mobile/src/app/started/started.ts` (+ spec): explains the phone table is not yet available (FR-013), back to list
- [x] T020 [US3] Integrate in `list.ts` (open dialog, `game:join`) and `game-lobby.ts` (guest view: read-only settings, ready/leave bar, live updates), navigate to `started` on game start

**Checkpoint**: All lobby flows work end to end with desktop players.

---

## Phase 6: User Story 4 - Operate everything with touch on narrow screens (Priority: P2)

**Goal**: Verify and fix layout and touch quality across all screens.

**Independent Test**: At 320 px portrait and 568×320 landscape with max-length names and German texts, no horizontal scroll and no clipped primary action (quickstart scenario 4).

- [x] T021 [US4] Long-content pass: wrap or truncate names, nicknames and computer names with visible ellipsis in `apps/mobile/src/styles.css` and the component styles; confirm component styles stay within the 4/8 kB budgets
- [x] T022 [US4] Landscape and keyboard pass: fixed action bars stay reachable with the on-screen keyboard, reduced height scrolls vertically; fix in component styles
- [x] T023 [US4] Manual viewport walk-through of every screen in both languages per quickstart.md (320, 480 portrait; 568, 932 landscape); fix findings

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T024 [P] Record the presets deferral in `docs/mobile-roadmap.md` (M1 section) and mark M1 status in `docs/roadmap.md` if it tracks mobile status (research R6)
- [x] T025 [P] Run `/speckit-coverage` for `apps/mobile` and `libs/client-core`; add tests until ≥ 80 %
- [x] T026 Run `npm run lint`, `typecheck`, `test`, `build` for all projects; confirm the initial mobile bundle stays under 500 kB and desktop suites pass unmodified (SC-005)
- [x] T027 Run quickstart.md scenarios 1-7 (including cross-client join against a desktop host and the desktop regression) and fix findings
- [ ] T028 Run `/speckit-sonar-validate` and resolve new issues

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: T001 → T002/T003 (parallel) → T004 → T005.
- **Foundational (Phase 2)**: needs Phase 1 (T008 needs `client-core`). T006 first; T007-T010 in parallel; T011 after T006, T009.
- **US1 → US2 → US3**: each needs Phase 2. US2 and US3 both extend `game-lobby.ts` (T016, T020), so do US2 first; US3's join dialog (T018) and started notice (T019) are independent of US2.
- **US4**: after US1-US3 screens exist.
- **Polish**: after all stories.

### Parallel Opportunities

- T002 ∥ T003; T007 ∥ T008 ∥ T009 ∥ T010; T012 ∥ T013; T018 ∥ T019; T024 ∥ T025.

## Parallel Example: Foundational

```text
Task: "Service spec in apps/mobile/src/app/core/mobile-socket.service.spec.ts"
Task: "Mobile i18n in apps/mobile/src/app/core/i18n.service.ts"
Task: "Session guard in apps/mobile/src/app/core/session.guard.ts"
Task: "Theme styles in apps/mobile/src/styles.css"
```

## Implementation Strategy

### MVP First

1. Phase 1 + 2, then US1 (T012-T014). Validate: nickname and live list on a phone.
2. Add US2 (host) → validate; add US3 (join) → validate cross-client. US1+US2+US3 together satisfy the M1 acceptance criteria.
3. US4 hardens layout; Polish closes coverage, Sonar and docs.

## Notes

- Mobile depends only on `scope:shared`; never import from `apps/frontend`.
- Server authority (FR-015): UI only renders pushes, never applies lobby changes locally.
- Commit per task or logical group using Conventional Commits.
