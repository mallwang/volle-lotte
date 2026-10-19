# Implementation Plan: Remembered Settings and Presets

**Branch**: `015-remembered-settings` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-remembered-settings/spec.md`

**Design**: [design.md](./design.md), mockup [mockup.html](./mockup.html)

## Summary

The frontend remembers a "last setup" (seats, rules, computers, computer speed) and up to 10 named presets in `localStorage`, behind one store service. The create-game page is prefilled from the last setup and gets a preset bar (load, save, reset). A newly created game receives its remembered computers and speed through the existing `seat:set` and `game:settings` intents right after creation, so neither the server nor the protocol changes. The lobby gets the same bar for the host (load applies computers and speed only) and a question on "Start game" when the setup is neither an unchanged loaded preset nor the unchanged last setup. The nickname is already remembered by the existing session storage; this feature only adds a test for it.

## Technical Context

**Language/Version**: TypeScript, strict mode, Node.js >=24; Angular 22 (standalone components, signals)

**Primary Dependencies**: Existing Nx 23 monorepo, PrimeNG (Dialog, Button, InputText, Message); no new dependency

**Storage**: Browser `localStorage`, two new keys (`vl-last-setup`, `vl-presets`), versioned JSON; no server storage, no schema change

**Testing**: Vitest in `apps/frontend` (pure functions, store, components); `npm run test`, `lint`, `typecheck`, `build` through Nx; the UI is verified once with Playwright (skill `verify-ui`)

**Target Platform**: Browser clients (desktop and phone, PWA); backend untouched

**Project Type**: Nx web application, frontend-only change

**Performance Goals**: Storage reads happen once per page load per key; dialogs open instantly (at most 10 presets)

**Constraints**: Device-local data, never sent to the server; storage may be blocked, full or corrupt and must never break a page; no protocol change, `PROTOCOL_VERSION` stays; English and German texts without gender-inclusive forms; module boundaries unchanged

**Scale/Scope**: At most 10 presets and one last setup per device; 8 seats, 11 card types; 3 new components, 1 service, 1 pure module

## Constitution Check

_Gate: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                   | Status | Plan alignment                                                                                                                                                 |
| ------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Server-authoritative game state          | PASS   | Remembered values are only form input. Computers and speed reach the room through the existing host intents; the server validates them as for any host.        |
| II. Pure, tested rules engine               | PASS   | No rules change. Rules from a preset are checked with the existing `rulesError` before use; invalid parts fall back to `defaultRules()`.                       |
| III. Test coverage                          | PASS   | Pure module, store, apply helper and components get tests in the same change; no new skip entries.                                                             |
| IV. One container, SQLite, survivable games | PASS   | No server or persistence change, no protocol bump.                                                                                                             |
| V. Anonymous play                           | PASS   | Data stays in the browser; the game password is never stored; nothing secret is logged or committed.                                                           |
| VI. UX first                                | PASS   | Reviewed with `/speckit-ux-review` (design.md); 44px targets, keyboard operable dialogs, status by text, mobile layout checked in the mockup.                  |
| VII. Simplicity                             | PASS   | One store, one pure module, three small components, no new dependency or configuration option. The compare-with-reference rule avoids a lookup in all presets. |

**Gate result**: PASS (re-checked after Phase 1: unchanged, no deviation).

## Project Structure

### Documentation (this feature)

```text
specs/015-remembered-settings/
├── plan.md
├── spec.md
├── design.md
├── mockup.html
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── local-storage.md
├── checklists/
│   └── requirements.md
└── tasks.md              # created by /speckit-tasks
```

### Source Code (repository root)

```text
apps/frontend/src/app/
├── core/
│   ├── setup.ts                   # pure: Setup type, defaults, sanitize, equals, summary, planComputers
│   ├── setup-store.ts             # service: last setup, presets, reference, storage availability
│   ├── setup-apply.ts             # applies computers and speed to a room through seat:set / game:settings
│   └── *.spec.ts
├── shared/
│   ├── preset-bar.ts              # buttons + the two dialogs, shared by create page and lobby
│   ├── preset-list-dialog.ts      # load / apply / delete
│   ├── preset-save-dialog.ts      # name, overwrite, limit
│   └── *.spec.ts
├── create-game/create-game.ts     # prefill, preset bar, reset, pending computers, apply after create
├── game-lobby/game-lobby.ts       # preset bar for the host, "did not fit" message, start question, save last setup
├── nickname/nickname.spec.ts      # test: stored nickname is prefilled (existing behaviour)
└── i18n/{en,de}.ts                # new texts

docs/
├── user-guide.md, user-guide.de.md  # remembered settings and presets
└── roadmap.md                       # R10 delivered, spec 015 row
```

**Structure Decision**: Frontend only. Pure logic lives in `core/setup.ts` so it is testable without Angular; the store is the only code that touches `localStorage` for this feature.

## Complexity Tracking

| Item                                     | Why needed                                                                                          | Simpler alternative rejected because                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| In-memory "reference" setup in the store | Decides when the start question is shown without comparing against all presets (spec FR-023 to 026) | Comparing with every preset needs the full list and normalised equality on every start; asking always nags |
| Client applies computers after create    | Avoids a protocol change and keeps the server as validator                                          | Extending `game:create` with computers needs a protocol bump and server tests for a convenience feature    |
