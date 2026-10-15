# Implementation Plan: Rules Engine

**Branch**: `001-rules-engine` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-rules-engine/spec.md`

## Summary

Implement the complete Volle Lotte rules as a pure TypeScript library in the existing `libs/game-rules` Nx project: scoring, one turn, the card effects, the game (2-8 players, target score, ranking) and JSON save/restore. The engine is a single reducer, `applyAction(state, action, rng) -> { ok, state, events } | { ok: false, reason }`. State is plain, immutable JSON data and all randomness comes from an injected `randomInt`. The Java tests are ported first, then extended per rule. See [research.md](research.md) for the decisions.

## Technical Context

**Language/Version**: TypeScript ~6.0 (strict, ES2022, `nodenext`), Node >= 22

**Primary Dependencies**: none (no new dependency; the library has no runtime imports)

**Storage**: N/A (the library only produces and validates plain data; persistence is a later feature)

**Testing**: Jest 30 with `@swc/jest` (already configured in `libs/game-rules`), run through Nx

**Target Platform**: runs unchanged on the Node backend and in the browser (no Node-only APIs in `src/`)

**Project Type**: library (`libs/game-rules`, tag `scope:shared`)

**Performance Goals**: 10,000 simulated complete games (SC-006) in well under a minute on a developer machine

**Constraints**: no I/O, no clock, no framework imports, no global state, no mutation of passed-in state

**Scale/Scope**: 2-8 players, 56-card default deck, about 8 source files and 6 spec files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                     | Status | Notes                                                                                                                    |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| I. Server-authoritative       | Pass   | Engine validates every action and takes dice and shuffles from an injected source; the server passes `crypto.randomInt`. |
| II. Pure, tested rules engine | Pass   | Pure functions in `libs/game-rules`, no I/O, Java tests ported first, `docs/rules.md` is the source of truth.            |
| III. Test coverage            | Pass   | Target 95% (SC-003), above the 80% minimum; nothing in the library is excluded.                                          |
| IV. One container, SQLite     | Pass   | Not touched. State is JSON-serializable with validation on restore, which enables later persistence.                     |
| V. Anonymous play             | Pass   | Not touched. Players are seats with a display name; no identity or secrets in the engine.                                |
| VI. UX first                  | Pass   | No UI. The API exposes `legalActions` and rejection reasons so a UI can guide the player.                                |
| VII. Simplicity               | Pass   | No new dependency, one reducer, no class hierarchy, no plugin points; configurable rules limited to rules.md.            |

Post-design re-check: still passes. The design adds no dependency, service or configuration option beyond rules.md.

## Project Structure

### Documentation (this feature)

```text
specs/001-rules-engine/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── public-api.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
libs/game-rules/
├── package.json         # existing
├── jest.config.cts      # existing
├── tsconfig*.json       # existing
├── eslint.config.mjs    # existing
├── README.md            # updated: usage and link to the contract
└── src/
    ├── index.ts         # public exports only (replaces generator stub)
    └── lib/
        ├── types.ts         # Card, Rules, TurnState, GameState, Action, Rejection, Event
        ├── rng.ts           # RandomInt type, shuffle (Fisher-Yates), seeded test PRNG helper
        ├── scoring.ts       # scoreDice, hasScoringDie, isVolleLotte (port of Punkte)
        ├── cards.ts         # default deck set, buildDeck, draw with reshuffle
        ├── turn.ts          # turn phases and card effects (port of Runde, extended)
        ├── game.ts          # createGame, applyAction, ranking, legalActions (port of Spiel, extended)
        ├── serialize.ts     # toJSON/fromJSON with validation
        ├── scoring.spec.ts  # port of PunkteTest + extensions
        ├── cards.spec.ts    # deck counts, reshuffle (port of SpielTest.deckReshufflesWhenEmpty)
        ├── turn.spec.ts     # port of RundeTest + one block per card effect
        ├── game.spec.ts     # port of SpielTest.playersTakeTurns, target score, ranking, rejection
        ├── serialize.spec.ts # round trip, malformed data, save/restore equivalence
        └── simulation.spec.ts # seeded determinism, 10,000 random games
```

**Structure Decision**: Everything lives in the existing `libs/game-rules` project; `apps/*` are not touched. Source files are split by rule area, mirroring the Java classes (`Punkte` → `scoring`, `Runde` → `turn`, `Spiel` → `game`, `Kartenstapel`/`Karte` → `cards`/`types`). The generator stubs `src/lib/game-rules.ts` and `game-rules.spec.ts` are deleted.

## Complexity Tracking

No violations.
