# game-rules

Pure TypeScript rules engine for Volle Lotte (rules: [docs/rules.md](../../docs/rules.md)). No I/O, no mutation, state is plain JSON. API contract: [public-api.md](../../specs/001-rules-engine/contracts/public-api.md).

```ts
import { randomInt } from 'node:crypto';
import { applyAction, createGame, defaultRules, legalActions } from 'game-rules';

const rng = (n: number) => randomInt(n); // server only
let state = createGame(['Ann', 'Ben'], defaultRules(), rng);

const out = applyAction(state, { type: 'draw' }, rng);
if (out.ok)
  state = out.state; // out.events for UI and logs
else console.log(out.reason); // e.g. 'wrongPhase'

legalActions(state); // everything applyAction would accept now
```

Persist with `toJSON(state)` and restore with `fromJSON(data)` (validates, never throws).

## Commands

`npx nx test game-rules`, `npx nx lint game-rules`, `npx nx typecheck game-rules`.
