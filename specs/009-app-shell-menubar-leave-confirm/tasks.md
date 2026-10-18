---
description: 'Task list for 009 App Shell Navbar and Leave-Game Confirmation'
---

# Tasks: App Shell Navbar and Leave-Game Confirmation

**Input**: Design documents from `/specs/009-app-shell-menubar-leave-confirm/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-contract.md](contracts/ui-contract.md), [quickstart.md](quickstart.md), [design.md](design.md)

**Tests**: Included for new logic (constitution III): unit tests in the same change, axe checks for the shell. Browser behaviour (browser back, focus return, 695 px bar) is verified with a throw-away Playwright script (skill `verify-ui`), not a permanent suite.

**Organization**: Grouped by user story. Frontend only; all paths are under `apps/frontend/src/` unless noted. Do not touch the scale logic, table internals, dice, game log or `lobby/lobby.ts` (FR-017).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task)
- **[Story]**: US1 menubar, US2 leave confirmation, US3 theme, US4 create-game form

---

## Phase 1: Setup

- [x] T001 Load the PrimeNG MCP/skill guidance for `menubar`, `confirmdialog` and `ConfirmationService` once (skill `primeng:primeng-component-implementation`) and check the installed PrimeNG version supports the `#item`, `#start`, `#end` templates and `breakpoint`; record any API difference from [research.md](research.md) in the PR description draft only

---

## Phase 2: Foundational (blocks US1 and US2)

- [x] T002 Provide `ConfirmationService` (from `primeng/api`) next to `MessageService` in `app/app.config.ts`
- [x] T003 [P] Add EN keys in `app/i18n/en.ts` and DE keys in `app/i18n/de.ts` per [contracts/ui-contract.md](contracts/ui-contract.md): `leave.running.title|body|confirm`, `leave.lobbyHost.title|body|confirm`, `leave.lobbyGuest.title|body|confirm`, `nav.current`, `nav.current.lobby`, `nav.current.running`, `theme.switchToLight`, `theme.switchToDark`; keep `leave.cancel` ("Stay") and `game.leave`; do not remove the old keys yet (removed in T026). Check the real consequence of leaving a running game in the backend before wording `leave.running.body` (computer takes the seat) and keep EN and DE equivalent; the i18n parity test must stay green

**Checkpoint**: service and strings exist.

---

## Phase 3: User Story 1 - Menubar with all pages, current page highlighted (Priority: P1)

**Goal**: one PrimeNG menubar on every screen with brand, page links, "Current game" status entry, language select and theme button; content limited to 1200 px; no hamburger at 695 px.

**Independent Test**: [quickstart.md](quickstart.md) section 2.

- [x] T004 [US1] In `app/app.ts` import `MenubarModule` (`primeng/menubar`), `TagModule`, keep `RouterLink`/`RouterLinkActive`; add a `protected readonly items = computed(...)` building `MenuItem[]` from `socket.session()` and `socket.game()`: "Games" (`routerLink: '/lobby'`), "Create game" (`routerLink: '/create-game'`), both `disabled: !socket.session()`, labels from `nav.games` and `nav.create`; plus a status item (`id: 'current'`, label `nav.current`, no `routerLink`) only while `socket.game()` is in phase `lobby` or `running`, with the tag text from `nav.current.lobby` or `nav.current.running`; no status item for phase `finished` (result page, no warning)
- [x] T005 [US1] In `app/app.html` replace `<header class="vl-header">` and `<nav class="vl-nav">` with `<p-menubar [model]="items()" [breakpoint]="..." [ariaLabel]="'nav.main' | t">` (set the breakpoint so the collapsed layout never applies, see [research.md](research.md) section 2) wrapped in a band whose inner wrapper has `max-width: 1200px; margin-inline: auto`; `#start` template: logo image, "Volle Lotte" and the version (as in the current header); `#end` template: the existing language `p-select` and the theme `p-button` unchanged for now; `#item` template: for items with `routerLink` render `<a [routerLink] routerLinkActive="vl-menu-active" ariaCurrentWhenActive="page">`, for `disabled` items a `<span aria-disabled="true">`, for the status item a non-interactive `<span aria-current="page">` with label and `<p-tag>` (colour plus text, never colour only)
- [x] T006 [US1] In `styles.css` remove `.vl-nav` and the old `.vl-header` navigation rules that became unused; add `.vl-bar` (full-width band), `.vl-bar-in` (1200 px, centred), `.vl-menu-active` (fill `--p-primary-50`-like token from the Terracotta preset, bold, 3 px underline in `--p-primary-color`, readable in both themes), status entry styling, hidden version text below a narrow width; keep the 44 px minimum touch target of entries and a 3 px focus ring in both themes; the bar must keep scaling with the stage in a running game (it stays inside `.vl-stage-inner`, spec 008 unchanged)
- [x] T007 [P] [US1] Update `app/app.spec.ts`: renders the menubar with "Lobby"/"Create game" entries; the entry for the open route has `aria-current="page"` and the other does not; without a session both entries are disabled and language and theme controls still work; with `socket.game()` in phase `lobby` or `running` the status entry shows the right tag and the links stay visible; no status entry without a game; `expectNoA11yViolations` in both modes (if axe rejects the non-link item inside the menubar, move the status entry into the `#end` area next to the controls and update [research.md](research.md) section 3)
- [x] T008 [US1] Verify with a throw-away Playwright script (quickstart section 2): highlight per page in light and dark, 695 px width shows all entries without hamburger, 1600 px width keeps menubar and pages within 1200 px while the running table keeps its 992 px size, keyboard Tab/arrow navigation reaches every entry and shows the focus ring

**Checkpoint**: US1 works alone (leave dialog not yet wired; clicking a link in a game still navigates away without asking until US2).

---

## Phase 4: User Story 2 - Confirmation before leaving a game or lobby (Priority: P1)

**Goal**: one shared confirmation for navbar links, browser back and the in-page leave buttons; texts per situation; no dialog for finished games.

**Independent Test**: [quickstart.md](quickstart.md) section 3.

- [x] T009 [US2] Make `SocketService.leave()` in `app/core/socket.service.ts` return `Promise<boolean>`: `true` when the server acknowledged and `game` was cleared (existing behaviour including `refreshLobby()`), `false` when the ack is not ok; on `false` call the existing `notify('error', errorMessage(ack, this.i18n))`; update the existing `leave` tests in `app/core/socket.service.spec.ts` and add a case for the rejected leave
- [x] T010 [US2] Create `app/core/leave-game.ts` with the `LeaveGame` root service per [data-model.md](data-model.md): computed `situation` (`'none' | 'running' | 'lobbyHost' | 'lobbyGuest'`) from `socket.game()` using `isHost` from `app/core/game-view.ts` (no game, phase `finished`, or `you.seat < 0` give `none`); signal `leaving`; `confirm(): Promise<boolean>` using `ConfirmationService.confirm` with the situation's header, message and accept label, reject label `leave.cancel`, `defaultFocus: 'reject'`, danger accept button, `accept` resolving `true`, `reject` (also Escape, close icon) resolving `false`, single-flight (a second call returns the pending promise); an `effect` that, when `situation()` becomes `none` while a dialog is open, calls `ConfirmationService.close()` and resolves the promise with `true`; `request(): Promise<void>` doing `if (await confirm() && situation() !== 'none') await socket.leave()`; and the exported guard `leaveGameGuard: CanDeactivateFn<Game>` implementing [research.md](research.md) section 6 (set `leaving` while `socket.leave()` runs, return `false` when the user stays or the leave fails)
- [x] T011 [P] [US2] Unit tests in `app/core/leave-game.spec.ts`: situation for each phase, host/guest, removed seat and no game; `confirm()` resolves `true` without a dialog for `none`; accept resolves `true`, reject resolves `false`; a second `confirm()` while open returns the same promise and opens one dialog; dialog closes and resolves `true` when the situation turns `none`; guard returns `false` on "Stay", `true` after a successful leave (with `leaving` set during the call and reset afterwards), `false` when `socket.leave()` returns `false`; texts differ per situation (EN)
- [x] T012 [US2] Register the dialog host: add `ConfirmDialogModule` to `app/app.ts` imports and `<p-confirmdialog />` next to `<p-toast>` in `app/app.html` (outside the scaled stage, with `[style]` width 28rem and `maxWidth: '95vw'` like the current leave dialog)
- [x] T013 [US2] Add `canDeactivate: [leaveGameGuard]` to the `game/:id` route in `app/app.routes.ts`
- [x] T014 [US2] In `app/game/game.ts` inject `LeaveGame` and make the redirect effect skip while `leave.leaving()` is true, so a guarded leave cannot replace the clicked target with `/lobby` (the effect still redirects for every other case where `socket.game()` becomes `null`)
- [x] T015 [US2] In `app/table/table.ts` remove the leave `p-dialog` (`leave.title`, `leave.body`, `leave.cancel`, `leave.confirm` block), the `leaveOpen` signal and its imports if unused; the toolbar "Leave game" button calls `leave.request()` (inject `LeaveGame`); keep the "removed" dialog and `[disabled]="removed()"` as they are
- [x] T016 [US2] In `app/game-lobby/game-lobby.ts` change the "Withdraw"/"Leave game" button from `socket.leave()` to `leave.request()` (inject `LeaveGame`); the result screen `app/result/result.ts` keeps calling `socket.leave()` directly (no dialog for finished games)
- [x] T017 [P] [US2] Update tests: in `app/table/table.spec.ts` (around the existing leave test) the button now opens the shared dialog and `socket.leave` is only called after accepting; in `app/game-lobby/game-lobby.spec.ts` add the same for host ("Cancel your planned game?") and guest ("Leave the lobby?"); remove assertions on the deleted table dialog
- [x] T018 [US2] Verify with a throw-away Playwright script (quickstart section 3) against a running game, a host lobby and a guest lobby: link click, browser back and forward, "Stay" and Escape (focus returns to the trigger), confirm leaves once and lands on the clicked page without passing through another page, in-page buttons, finished game without dialog, host cancel while the dialog is open

**Checkpoint**: US1 and US2 deliver the shell; leaving is always confirmed.

---

## Phase 5: User Story 3 - Light and dark theme toggle (Priority: P2)

**Goal**: two modes only, initial value from the device preference once, stored choice wins, PrimeIcons button with an accessible name.

**Independent Test**: [quickstart.md](quickstart.md) section 4.

- [x] T019 [US3] Rewrite `app/core/theme.service.ts`: `ThemeMode = 'light' | 'dark'`; `MODES` and the valid-value set contain only those; `read()` returns the stored value if valid, otherwise `matchMedia('(prefers-color-scheme: dark)')` evaluated once (`dark` if it matches, else `light`; `light` when `matchMedia` is unavailable); remove `systemDark`, the `change` listener and `resolved`; the effect toggles `app-dark` from `mode()`; `set()` still stores; replace `next()` with `toggle()` that flips the mode and stores it; nothing is stored until the first toggle. Keep the `THEME_KEY` comment about the pre-paint script in `index.html` (its logic already treats unknown values like "no choice")
- [x] T020 [P] [US3] Rewrite `app/core/theme.service.spec.ts`: dark/light device preference gives the matching initial mode without writing storage; `toggle()` flips and persists; stored `light`/`dark` win over the device preference; stored `system` and `purple` are ignored (device preference decides); storage errors do not throw; the `app-dark` class follows the mode
- [x] T021 [US3] In `app/app.html` replace the inline SVG theme button with `<p-button [rounded]="true" [text]="true" severity="secondary" [icon]="theme.mode() === 'dark' ? 'pi pi-moon' : 'pi pi-sun'" (onClick)="theme.toggle()" [ariaLabel]="...">` where the accessible name states the current theme and the action (`theme.label`, `theme.light`/`theme.dark`, `theme.switchToLight`/`theme.switchToDark`) and the tooltip shows the action; remove the `vl-theme-icon` rules from `styles.css`
- [x] T022 [US3] Update the theme tests in `app/app.spec.ts` (mock with `mode` and `toggle`): the click calls `toggle`, the accessible name changes with the mode, the icon class switches between `pi-sun` and `pi-moon`
- [x] T023 [US3] Remove `theme.system` from `app/i18n/en.ts` and `app/i18n/de.ts`; grep `apps/frontend/src`, `docs/` and `README.md` for "system" theme wording and fix every hit; update `docs/user-guide.md` section 4 (header navigation with menubar and "Current game" status, colour scheme is Light or Dark and starts from the device preference, one sentence on the leave confirmation in section 2 where leaving is described)

**Checkpoint**: theme works alone; US1 and US2 are unaffected.

---

## Phase 6: User Story 4 - Create-game form (Priority: P3, droppable)

**Goal**: consistent form controls without changing behaviour.

**Independent Test**: [quickstart.md](quickstart.md) section 5.

- [x] T024 [US4] (dropped: the form is already a centred column and restyling it is not a small template change; noted in the roadmap) Only if T001 to T023 are done and reviewed: in `app/create-game/create-game.ts` replace the hand-made `vl-field` label markup for the name, password and numeric rule inputs with PrimeNG `FloatLabel`/`InputNumber` (or drop this story if more than small template changes are needed, see [research.md](research.md) section 8); keep all ids, `name` attributes, defaults, validation messages and the autofill-blocking attributes; update `app/create-game/*.spec.ts` only where selectors change; verify per quickstart section 5. If dropped, mark this task `[x]` with "dropped" and note it in the roadmap entry

---

## Phase 7: Polish

- [x] T025 Run `npm run lint`, `npm run typecheck` and `npm run test` (and the affected Nx targets); fix findings
- [x] T026 Remove now unused i18n keys `leave.title`, `leave.body`, `leave.confirm` from `app/i18n/en.ts` and `app/i18n/de.ts` and any dead CSS (`.vl-nav`, `.vl-theme-icon`) left in `styles.css`; make sure `grep` finds no remaining reference
- [x] T027 Run the full [quickstart.md](quickstart.md) (all sections) in light and dark and in EN and DE; confirm SC-007: the existing tests for scaling, table, dice, log and the open-games list pass unchanged
- [x] T028 Update `docs/roadmap.md`: move R7 to Done as spec 009 with a one-line result (and the note if T024 was dropped); update `README.md` if it describes the header or the theme
- [x] T029 Run `/speckit-sonar-validate` (or `/speckit-sonar-local`) and resolve findings in the changed files

---

## Dependencies & Execution Order

- Phase 1 first. Phase 2 (T002, T003) blocks US1 and US2.
- US1 (T004 to T008) and US3 (T019 to T023) are independent of each other; US3 touches `app.html` too, so do US1's T005 first or merge carefully.
- US2 depends on T002, T003 and on US1's `app.html` structure only for T012 (dialog host placement); T009, T010, T011 can start right after Phase 2.
- Within US2: T009 -> T010 -> (T011 [P], T012, T013, T014) -> T015, T016 -> T017 -> T018.
- US4 (T024) last, optional. Polish after all chosen stories.

## Parallel Opportunities

- T003 with T002.
- T007 with T004 to T006 once the template compiles.
- T011 with T012 to T014 after T010.
- T017 with T018 prep.
- T020 with T019 once the API is fixed; US3 as a whole in parallel with US2 if `app.html` edits are coordinated.

## Implementation Strategy

- **MVP**: Phase 1, 2, US1 and US2 (shell plus safe leaving); both are P1 and ship together because the links stay visible in a game only when leaving is confirmed.
- Then US3 (small, independent), then US4 only if time allows.
- Commit per phase with Conventional Commits (`feat(frontend): ...`); the pre-push hook runs affected typecheck and tests.
