# Implementation Plan: Multi-language support (i18n)

**Branch**: `004-multi-language-i18n` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-multi-language-i18n/spec.md`; approved layout in [design.md](design.md).

## Summary

Make all user-visible frontend texts available in German and English. The language defaults to the browser language, can be changed instantly through a flag select next to the theme selector, and is persisted in `localStorage`. Technical approach: a small signal-based `I18nService` mirroring `ThemeService`, typed English/German dictionaries bundled with the app, a `t` pipe/`translate()` helper, and frontend mapping of backend reason codes (no backend change). Documentation: `README.de.md`, `docs/user-guide.md` + `docs/user-guide.de.md`, and bilingual pairs in the docs skill.

## Technical Context

**Language/Version**: TypeScript, Angular ~22.2 (signals, standalone components)

**Primary Dependencies**: existing only (Angular, PrimeNG `p-select`); no new dependency (see [research.md](research.md))

**Storage**: browser `localStorage`, key `vl-language` (per device; nothing on the server)

**Testing**: existing frontend unit tests (Vitest/Angular test setup as used in `apps/frontend`); unit tests for `I18nService`, a parity test (de keys == en keys), component test for the select

**Target Platform**: modern browsers, mobile and desktop

**Project Type**: web application (Nx monorepo, frontend change only plus docs)

**Performance Goals**: language switch visible in < 1 s (SC-002); synchronous signal update, no network

**Constraints**: no reload on switch (FR-004); storage may be unavailable (FR-006); English fallback (FR-007)

**Scale/Scope**: 2 languages, ~11 templates/components with hard-coded English, ~22 error reasons, ~2 docs pairs

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                      | Assessment                                                                                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-authoritative state / pure rules engine | Unaffected. Language is a client-only presentation preference; `libs/game-rules` and the backend stay untouched. Backend keeps sending reason codes, the frontend translates. |
| Test coverage target 80%                       | New service and mapping are unit-tested; parity test guards missing keys.                                                                                                     |
| Single container / anonymous play              | Unaffected; no account or server storage.                                                                                                                                     |
| UX first (a11y)                                | Select has an accessible name per language, flags are decorative (`aria-hidden`), keyboard operation comes from PrimeNG `p-select`; `<html lang>` follows the language.       |
| Simplicity / YAGNI                             | No new dependency: hand-rolled service (~60 lines) instead of Transloco/ngx-translate. Passes without Complexity Tracking.                                                    |

Post-design re-check: still passes; no violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-multi-language-i18n/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── i18n-ui-contract.md
├── design.md / mockup.html / spec.md / checklists/
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
apps/frontend/src/
├── index.html                      # pre-paint: set <html lang> from storage/browser
└── app/
    ├── app.html / app.ts           # language select next to theme selector
    ├── core/
    │   ├── i18n.service.ts         # language signal, detect, persist, t()
    │   ├── i18n.service.spec.ts
    │   ├── translate.pipe.ts       # `{{ 'key' | t: params }}`
    │   ├── error-message.ts        # returns translated text via I18nService
    │   └── theme.service.ts        # unchanged (pattern reference)
    ├── i18n/
    │   ├── en.ts                   # source dictionary, defines the key type
    │   ├── de.ts                   # typed as the same shape as en
    │   └── i18n.spec.ts            # parity test
    └── <feature components>        # hard-coded texts replaced by keys

README.md, README.de.md
docs/user-guide.md, docs/user-guide.de.md
.claude/skills/speckit-docs-update/SKILL.md   # bilingual pairs
```

**Structure Decision**: Frontend-only change inside `apps/frontend`; no change to `apps/backend` or `libs/game-rules`. Docs live in the repository root and `docs/` like in Vaultfolio.

## Complexity Tracking

No constitution violations.
