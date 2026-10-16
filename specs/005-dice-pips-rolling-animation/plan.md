# Implementation Plan: Dice Pips and Rolling Animation

**Branch**: `005-dice-pips-rolling-animation` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-dice-pips-rolling-animation/spec.md`; approved layout in [design.md](design.md) / [mockup.html](mockup.html).

## Summary

Replace the digit dice with pip faces (table and log), animate every thrown die on the client with its own random 2–5 s duration ending on the server value, and hold back the throw's log entry and toasts until the last die stops. Server values and rules are untouched; the server only gains (a) computer pacing that waits for the roll (roll max + 3 s, 2 s after other actions, computer pick shown as a highlight before it is applied) and (b) a host-owned `fastComputerDice` game setting. "Skip animation" is a local device preference. See [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript, Node 24, Angular 22.2 (signals, standalone), NestJS

**Primary Dependencies**: existing only (PrimeNG 22.1 Dialog/ToggleSwitch, socket.io); no new dependency

**Storage**: `localStorage['vl-skip-dice']` for the local skip setting; `fastComputerDice` lives in the in-memory `GameRoom` (persistence is not built yet)

**Testing**: Vitest/Jest as in the repo; fake timers for roll and pacing; component tests for pips and settings

**Target Platform**: Browsers (desktop/phone, light/dark), Linux container

**Project Type**: web application (Nx monorepo: `apps/frontend`, `apps/backend`, `libs/game-rules`)

**Performance Goals**: animation via CSS transforms only (compositor), no per-frame JS; up to 6 dice

**Constraints**: all dice stop ≤ 5 s after the throw (≤ 2.5 s computer fast mode); `prefers-reduced-motion` honoured; touch target ≥ 44 px; accessible labels in EN/DE

**Scale/Scope**: 1 new shared component pair (die face + rolling), 1 service, 1 dialog, protocol v2 (one intent, one field)

## Constitution Check

| Principle                | Result | Notes                                                                                                                                                                                            |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I Server-authoritative   | Pass   | Values still come from the server (`crypto.randomInt`); the client animation only decides when a value is revealed and never sends or alters one. `game:settings` is host-validated server-side. |
| II Pure rules engine     | Pass   | `libs/game-rules` engine unchanged; only `protocol.ts` (types, `PROTOCOL_VERSION = 2`) changes.                                                                                                  |
| III Test coverage        | Pass   | Tests for pip mapping, roll planning/gating, local pref, computer pacing, host-only setting. Template-only wrappers may use the skip list.                                                       |
| IV One container, SQLite | Pass   | No new service. Protocol bump to 2 is per the `protocolVersion` rule; the PWA is not built yet.                                                                                                  |
| V Anonymous play         | Pass   | Nothing touched.                                                                                                                                                                                 |
| VI UX first              | Pass   | Touch/mouse, keyboard-operable settings, reduced motion, non-colour selection cue; `/speckit-ux-review` already done (design.md).                                                                |
| VII Simplicity           | Pass   | One setting added only because FR-018 requires it; durations are fixed constants; no animation library (CSS keyframes).                                                                          |

Re-check after design: unchanged, no violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-dice-pips-rolling-animation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/protocol.md
├── design.md / mockup.html
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
libs/game-rules/src/lib/protocol.ts        # PROTOCOL_VERSION 2, GameView.fastComputerDice, 'game:settings'
apps/backend/src/app/lobby/
├── game-room.ts                           # fastComputerDice, computer pacing, pick-highlight step
├── lobby.gateway.ts                       # 'game:settings' (host only)
└── view.ts                                # expose fastComputerDice
apps/frontend/src/app/
├── shared/
│   ├── die-face.ts                        # pip face (1–6 / blank), used by table and log
│   └── dice-tile.ts                       # uses die-face; lift/border selection cue, rolling state input
├── core/
│   ├── dice-roll.ts                       # rollDurations() + DiceRollService (rolling signal, stopped count, reveal gate)
│   ├── dice-prefs.ts                      # skip-animation pref (localStorage)
│   ├── game-view.ts                       # logText returns structured parts incl. dice
│   └── socket.service.ts                  # settings(fast) intent
├── table/
│   ├── table.ts                           # gate log/toasts on roll, rolling text, settings button
│   └── settings-dialog.ts                 # skip (all), fast computer dice (host edits, guests read-only)
└── i18n/{en,de}.ts                        # labels, "Dice are rolling…", settings texts
```

**Structure Decision**: extend the existing web-app layout in place; `DiceTile` stays the single replaceable die component (003), now backed by `die-face`.

## Complexity Tracking

No violations.
