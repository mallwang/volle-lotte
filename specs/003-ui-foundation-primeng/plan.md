# Implementation Plan: UI Foundation

**Branch**: `003-ui-foundation-primeng` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-ui-foundation-primeng/spec.md`

## Summary

Replace the minimal frontend screens with a polished PrimeNG UI in the approved Warm Terracotta look
([design.md](design.md)), light and dark, and keep the game fully playable with placeholder dice and card tiles. The
approach: bump Angular 22.0 to 22.1 (plus `@angular/cdk`) and add `primeng` and `@primeuix/themes` in one step; a custom
preset on top of Aura carries the palette; a `ThemeService` toggles an `app-dark` class (system by default, manual
override persisted); each screen is migrated in place to PrimeNG components; dice, card and seat visuals live in small
presentational tiles so the later dice UI can replace them. Frontend only: no protocol, rules or backend change
(FR-018). Details: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript, Angular 22.1.x (standalone components, signals)

**Primary Dependencies**: `primeng` ^22.1.2, `@primeuix/themes`, `@angular/cdk` ^22.1 (peer), `axe-core` (dev, a11y tests)

**Storage**: N/A (only a `localStorage` theme preference, key `vl-theme`)

**Testing**: Jest (existing); contrast unit test for the preset; `axe-core` per screen in light and dark

**Target Platform**: Evergreen browsers, phones (from 320 px) and desktop, touch and mouse

**Project Type**: Web application (Nx monorepo; this feature touches `apps/frontend` only)

**Performance Goals**: No jank on a mid-range phone; initial bundle within the `project.json` budgets (raise only if
PrimeNG requires it, documented in the PR)

**Constraints**: WCAG AA contrast in both modes, reduced-motion respected, no horizontal scroll at 320 px, no
colour-only state, English text

**Scale/Scope**: 6 screens + app shell, disconnect dialog, 2-8 player table

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                     | Assessment                                                                                                    | Result |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| I. Server-authoritative       | No game logic on the client; tiles are presentational, actions still go through `turn:action`.                | Pass   |
| II. Pure, tested rules engine | `libs/game-rules` untouched; no rules in components.                                                          | Pass   |
| III. Test coverage            | Specs updated per screen; `ThemeService`, tiles, preset contrast tested; no new coverage exclusions.          | Pass   |
| IV. One container, SQLite     | No backend or deployment change; build output stays the single Angular bundle.                                | Pass   |
| V. Anonymous play, protected  | No accounts or secrets; join password only moves into a dialog. Theme preference is the only stored value.    | Pass   |
| VI. UX First                  | The purpose of this feature: touch + mouse, 320 px up, keyboard, focus management, non-colour cues, contrast. | Pass   |
| VII. Simplicity               | Stock PrimeNG components; custom code only for tiles and `ThemeService`. One new dev dependency (see below).  | Pass   |
| Workflow gates                | Hooks not bypassed; lint, typecheck, test, build and Sonar gate must stay green; `scope:frontend` boundaries. | Pass   |

**Post-design re-check** (after research, data model, contracts): unchanged, all Pass. `axe-core` is a test-only
dependency and is justified below.

## Project Structure

### Documentation (this feature)

```text
specs/003-ui-foundation-primeng/
├── spec.md
├── design.md            # approved layout and palette
├── mockup.html
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
package.json                              # Angular 22.1, @angular/cdk, primeng, @primeuix/themes, axe-core (dev)
apps/frontend/
├── project.json                          # budgets only if needed
└── src/
    ├── index.html                        # pre-paint dark-class script
    ├── styles.css                        # app CSS variables (status colours), reduced-motion rule, 44px targets
    └── app/
        ├── app.config.ts                 # providePrimeNG, MessageService
        ├── app.ts / app.html             # shell: header, theme toggle, toast, offline notice
        ├── theme/
        │   └── terracotta-preset.ts      # definePreset(Aura, ...) light + dark
        ├── core/
        │   ├── theme.service.ts          # mode signal, app-dark class, localStorage
        │   └── (socket, game-view, error-message: unchanged API)
        ├── shared/
        │   ├── dice-tile.ts              # replaceable placeholder (FR-017)
        │   ├── card-tile.ts              # replaceable placeholder (FR-017)
        │   └── player-tile.ts            # name, score, role, online, active
        ├── nickname/ create-game/ lobby/ # PrimeNG forms, cards, join dialog
        ├── game-lobby/                   # seat tiles, host actions
        ├── table/                        # table layout, turn actions, log, disconnect dialog
        └── result/                       # ranked list
```

**Structure Decision**: Keep the existing per-screen folders and migrate templates in place; add `theme/` and `shared/`
only for the preset and the three reusable tiles. No new Nx project or library.

## Complexity Tracking

| Violation                     | Why Needed                                                                  | Simpler Alternative Rejected Because                                       |
| ----------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| New dev dependency `axe-core` | SC-004 demands an automated a11y check in both modes; must run in pre-push. | Manual-only checks are not repeatable; a browser e2e stack is much larger. |
