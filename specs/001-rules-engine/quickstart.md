# Quickstart: validating the rules engine

Prerequisites: Node >= 22, npm >= 11, `npm install` done.

## 1. Tests and coverage

```bash
npx nx test game-rules --coverage
```

Expected: all specs pass; coverage for `libs/game-rules` is at least 95% (SC-003).

## 2. Lint and types

```bash
npx nx lint game-rules
npx nx typecheck game-rules
```

Expected: no errors; the library imports nothing outside itself (module boundaries, `scope:shared`).

## 3. Simulation

Part of the test run (`simulation.spec.ts`): 10,000 seeded random games end with a result, every intermediate state survives `fromJSON(toJSON(state))`, and the same seed produces the same games (SC-004, SC-006). Run alone:

```bash
npx nx test game-rules --testPathPattern=simulation
```

## 4. Manual smoke check

In a Node REPL after a build, `createGame(['A', 'B'], defaultRules(), rng)` followed by `applyAction(state, { type: 'draw' }, rng)` returns `{ ok: true, ... }` with a `cardDrawn` event; `applyAction(state, { type: 'bank' }, rng)` in phase `draw` returns `{ ok: false, reason: 'wrongPhase' }`. See [contracts/public-api.md](contracts/public-api.md) and [data-model.md](data-model.md).
