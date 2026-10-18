# Implementation Plan: Computer Player AI Rework

**Branch**: `011-computer-ai-rework` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-computer-ai-rework/spec.md`

## Summary

Computer players decide by expected value instead of fixed thresholds. Each computer seat gets a skill (`easy | medium | hard | random`) and an independent risk (`none | medium | high | random`); `random` is resolved per decision. The decision logic stays in the pure `libs/game-rules` engine and keeps running **on the server** inside the game room, exactly where `chooseAction` runs today. Rationale: it adds no websocket traffic (a computer move already causes one state push to every client), keeps Principles I and II intact, and the computation is cheap because the exact dice odds and the optimal-stopping tables are computed once and shared by all games (see [research.md](research.md), measured prototype: ~4 ms odds, 2-14 ms per table, then lookups only).

Technical approach:

1. `libs/game-rules/src/lib/computer/`: exact dice odds per free-dice count, a memoised value function for the bank-or-throw decision, card-by-card value of drawing after a Volle Lotte, a profile resolver for `random`, and `chooseAction(state, profile, rng)`.
2. Skill = how exactly the same evaluation is used (hard: argmax, medium: softmax with noise, easy: the old simple heuristic). Risk = one loss-aversion parameter (kappa) plus, for the draw decision, a logistic choice probability. Score situation shifts kappa.
3. Protocol v6: `seat:set` and `SeatView` carry `risk` next to `difficulty`; lobby seat row gets a second select; replacement computers are `random/random`.
4. Quality: invariant tests, scripted situation tests, seeded tournaments (hard > medium > easy), a performance test that bounds the cost per decision and the cache size.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node 22 (backend), Angular (frontend)

**Primary Dependencies**: none new (pure TypeScript in `libs/game-rules`; PrimeNG `p-select`/native select already used for the seat difficulty)

**Storage**: N/A (no persistence change; computer profile lives in the in-memory room seat like `difficulty` today)

**Testing**: Jest (`libs/game-rules`, `apps/backend`), Angular component tests, backend e2e (manual, `run-e2e`); seeded tournaments as a Jest spec that runs in the normal test target with a bounded game count

**Target Platform**: Linux container (single NestJS process), browsers on desktop

**Project Type**: web application (Nx monorepo: `apps/frontend`, `apps/backend`, `libs/game-rules`)

**Performance Goals**: a decision in the steady state well below 1 ms; first decision after start (cold tables) below 50 ms (SC-006); no new websocket messages

**Constraints**: single Node event loop shared by all rooms, so table building must be bounded, shared across rooms and must not grow with client-chosen rule values without a limit; deterministic per seed; no hidden information (card counts, never the real deck order)

**Scale/Scope**: dozens of concurrent rooms with up to 8 seats each; a handful of distinct rule sets in practice, arbitrary values possible (`minimumPoints`, `targetScore`, card counts are client-chosen at game creation)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Verdict | Notes                                                                                                                                                                                                                                        |
| ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Server-authoritative state       | Pass    | Computer decisions are computed and applied on the server; dice and card draws stay `crypto.randomInt` on the server. The noise for medium/random skill uses the same injected RNG, it never affects dice or deck.                           |
| II. Pure, tested rules engine       | Pass    | All logic is pure functions in `libs/game-rules` with the RNG injected. The frontend does not compute decisions (the idea of client-side computing was considered and rejected, see research R1).                                            |
| III. Test coverage                  | Pass    | New logic ships with unit, situation, invariant, tournament and performance tests (see Project Structure).                                                                                                                                   |
| IV. One container, survivable games | Pass    | No persistence change. Profiles are small (two enums per seat) and part of the room state that is persisted by R4 later. Module-level caches are rebuilt lazily after a restart.                                                             |
| V. Anonymous play                   | Pass    | Unchanged.                                                                                                                                                                                                                                   |
| VI. UX first                        | Pass    | One extra select per computer seat with the same pattern as today's difficulty select; keyboard and screen-reader labels per seat; both languages. A UX mockup was offered before planning and not needed for a second select in a seat row. |
| VII. Simplicity                     | Pass\*  | No new dependency. One justified complexity: a memoised value function (see Complexity Tracking).                                                                                                                                            |

Post-design re-check: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/011-computer-ai-rework/
├── plan.md              # This file
├── research.md          # Phase 0: decisions (server vs client, odds, value function, risk, cache)
├── data-model.md        # Phase 1: profile, situation, tables
├── quickstart.md        # Phase 1: how to validate
├── contracts/
│   └── protocol-v6.md   # Phase 1: socket contract changes
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
libs/game-rules/src/lib/
├── computer.ts                 # becomes the public entry: chooseAction(state, profile, rng), types (keeps the export path)
└── computer/
    ├── profile.ts              # Skill, Risk, Profile, resolve(profile, rng) for per-decision random
    ├── odds.ts                 # exact outcomes per free-dice count (multisets + probabilities + legal picks)
    ├── value.ts                # memoised optimal-stopping tables per (rules key, carried bucket, kappa)
    ├── cards.ts                # value of drawing a card after a Volle Lotte, per card type
    ├── situation.ts            # score situation -> kappa shift; target-reaching bank
    ├── select.ts               # which dice to set aside (all-dice filter, easy/medium/hard)
    ├── decide.ts               # bank / throw / draw (risk, logistic choice)
    └── *.spec.ts               # unit, situation, invariant, performance
libs/game-rules/src/lib/
├── protocol.ts                 # Risk type, SeatView.risk, seat:set risk, PROTOCOL_VERSION = 6
└── tournament.spec.ts          # seeded bot tournaments (bounded size)

apps/backend/src/app/lobby/
├── game-room.ts                # seat keeps { difficulty, risk }; levelFor() removed; chooseAction(state, profile, rng)
├── lobby.gateway.ts            # validate risk on seat:set
└── *.spec.ts                   # updated/added room and gateway tests

apps/frontend/src/app/
├── game-lobby/game-lobby.ts    # second select per computer seat
└── i18n/{en,de}.ts             # risk labels, aria labels

docs/ (rules.md unchanged; computer behaviour documented in the user guide), README(s)
```

**Structure Decision**: Keep the existing three-project layout. The decision code stays in the shared pure library and is only called by the backend room, so no module boundary rule changes. The frontend only renders the seat setting.

## Complexity Tracking

| Violation / complexity                                                | Why Needed                                                                                                                                                                                                                                                       | Simpler Alternative Rejected Because                                                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Memoised value function (module-level, bounded cache)                 | The spec asks for decisions that follow exact odds (3-of-a-kind vs singles, several 1s with a 5, when to stop with 400 vs 1000). Hand-written rules cannot cover the combinations of free dice, run, carried points and rule variants without becoming a tangle. | Fixed thresholds per level (today) cannot answer the questions; a Monte Carlo per decision would cost milliseconds per decision and is not deterministic.  |
| Module-level cache shared across rooms (hidden state in a "pure" lib) | Computing tables per decision would repeat 2-14 ms of work; sharing makes steady-state decisions lookups.                                                                                                                                                        | Per-room caches multiply memory and cold starts. The cache is a pure memo of a pure function (same input, same output), so purity of results is preserved. |
