# Implementation Plan: Sounds

**Branch**: `019-sounds` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md) | **Design**: [design.md](./design.md)

**Input**: Feature specification from `/specs/019-sounds/spec.md`

## Summary

Add six sound cues (game start, your turn, countdown beeps, own Volle Lotte, points credited, defeat) and one mute button in the menubar that also silences the existing victory sound. A new root service `Sounds` owns one audio element per cue, the device-local mute setting and `play`/`stop`; `Celebration` hands its victory sound over to it. The triggers reuse signals the frontend already derives: the table's `mine()` (your turn, countdown together with `deadlineAt()`), the table's log processing after the roll animation (Volle Lotte, points) and the game page's switch from lobby to table (game start). Each cue has its own file under `public/sounds/`, a copy of `victory.mp3` until the real files arrive. Frontend only; no protocol change.

## Technical Context

**Language/Version**: TypeScript, strict mode, Node.js >=24; Angular 22 frontend

**Primary Dependencies**: Existing Nx 23 monorepo, PrimeNG 22 (`p-button`, `pTooltip`), PrimeIcons (`pi-volume-up`, `pi-volume-off`); browser `HTMLAudioElement`; no new package

**Storage**: `localStorage` key `vl-muted` (device-local, optional); no server storage

**Testing**: Vitest (frontend) with a fake `Audio` as in `celebration.spec.ts` and fake timers for the countdown; `npm run test`, `lint`, `typecheck`, `build` through Nx; the UI checked once with Playwright (skill `verify-ui`)

**Target Platform**: Desktop and mobile browsers (Chromium, Firefox, Safari) with their autoplay rules

**Project Type**: Nx web application (Angular frontend, NestJS backend, shared libraries); only the frontend changes

**Performance Goals**: A cue plays within 0.3 s of its visible trigger (SC-004); sound files are preloaded when the table opens

**Constraints**: No protocol change (`PROTOCOL_VERSION` stays); no autoplay error surfaces; English and German texts; module boundaries unchanged; final new sound files at most 100 KB each

**Scale/Scope**: One service, one pure helper, small changes in five existing files, six placeholder assets, two texts per language pair

## Constitution Check

_Gate: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                   | Status | Plan alignment                                                                                                                 |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| I. Server-authoritative game state          | PASS   | Sounds only present what the client already received; no intent, no state change.                                              |
| II. Pure, tested rules engine               | PASS   | No rules change; `libs/game-rules` untouched.                                                                                  |
| III. Test coverage                          | PASS   | `Sounds`, `countdownDelays`, the table triggers, the game page and the menubar button get tests in the same change.            |
| IV. One container, SQLite, survivable games | PASS   | Static assets in the frontend build; no CDN; nothing to persist.                                                               |
| V. Anonymous play                           | PASS   | No identity change; the mute setting is device-local.                                                                          |
| VI. UX first                                | PASS   | One-click mute on every screen, keyboard operable, label and tooltip, state shown by icon and `aria-pressed`; approved mockup. |
| VII. Simplicity                             | PASS   | No dependency, no Web Audio graph, no per-cue settings; triggers reuse existing signals.                                       |

**Gate result**: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/019-sounds/
├── spec.md
├── design.md
├── mockup.html
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── sounds.md
├── checklists/
│   └── requirements.md
└── tasks.md              # created by /speckit-tasks
```

### Source Code (repository root)

```text
apps/frontend/
├── public/sounds/
│   ├── victory.mp3              # exists
│   └── game-start.mp3, your-turn.mp3, countdown.mp3, volle-lotte.mp3, points.mp3, defeat.mp3   # new, copies of victory.mp3
└── src/app/
    ├── core/
    │   ├── sounds.ts            # new: cues, audio elements, mute, countdownDelays
    │   ├── sounds.spec.ts       # new
    │   ├── celebration.ts       # victory sound via Sounds
    │   └── celebration.spec.ts  # adjusted
    ├── table/
    │   ├── table.ts             # preload; your-turn and countdown effects; Volle Lotte and points in process(); defeat with the game-over modal
    │   └── table.spec.ts        # new cases
    ├── game/
    │   ├── game.ts              # game-start on lobby -> running
    │   └── game.spec.ts         # new
    ├── app.html, app.ts         # sound button in the menubar
    ├── app.spec.ts              # new cases
    └── i18n/{en,de}.ts          # sound.* texts
docs/
├── user-guide.md, user-guide.de.md   # sounds and the mute button
└── roadmap.md                        # R11 to Done when shipped
```

**Structure Decision**: Everything stays in the frontend app. `Sounds` lives in `core/` next to `Celebration`, `ThemeService` and `DicePrefs`, the other app-wide presentation services; a separate Nx library is unnecessary for one frontend-only service.

## Phase 0: Outline & Research

See [research.md](./research.md): playback with one `HTMLAudioElement` per cue, where the logic lives, how each trigger is detected (your turn, countdown, game start, Volle Lotte, points), the mute setting, the menubar button and the asset layout.

## Phase 1: Design & Contracts

- [Data model](./data-model.md): the cue table with files and triggers, the mute setting, trigger state transitions.
- [Contract](./contracts/sounds.md): the `Sounds` API, `countdownDelays`, callers, the menubar control, i18n keys and asset paths.
- [Validation guide](./quickstart.md): unit tests and manual scenarios.

## Constitution Check (Post-Design)

| Principle                                   | Status | Design evidence                                                                                  |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| I. Server-authoritative game state          | PASS   | Triggers read the received view only.                                                            |
| II. Pure, tested rules engine               | PASS   | Untouched.                                                                                       |
| III. Test coverage                          | PASS   | Quickstart lists tests per file; `countdownDelays` is pure.                                      |
| IV. One container, SQLite, survivable games | PASS   | Assets in `public/`, served by the same container.                                               |
| V. Anonymous play                           | PASS   | Untouched.                                                                                       |
| VI. UX first                                | PASS   | Matches the approved design; sound never blocks or errors; spectators and replaced seats silent. |
| VII. Simplicity                             | PASS   | One service replaces the ad hoc audio in `Celebration`; no new dependency.                       |

**Post-design gate result**: PASS.

## Complexity Tracking

No violations.
