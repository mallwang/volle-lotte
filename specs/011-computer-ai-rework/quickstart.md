# Quickstart: Validate Computer Player AI Rework

Prerequisites: `npm install`, `npm run dev`; use the `verify-ui` skill for app URLs and selectors. Contract: [contracts/protocol.md](contracts/protocol.md), tables and profile: [data-model.md](data-model.md), decisions: [research.md](research.md).

## 1. Automated

```bash
npm run lint && npm run typecheck && npm run test
```

Expected: green, including

- situation specs (3x4 with 3 dice left banks, 4x1 with 2 dice left banks, several 1s with a 5, risk none never draws, risk medium about 50 % at indifference, risk high draws more but less with huge carried points and many Stop cards),
- invariants (legal action always, all-dice rule on Street/Double Lotte/Plus-Minus/Clover/Star for every skill, determinism per seed, `random` shares between 30 % and 37 %),
- the bounded tournament (hard > medium > easy by the margins of SC-001),
- the performance spec (cold first decision below 50 ms, steady-state decisions in the sub-millisecond range, cache size bounded under many distinct `minimumPoints`).

## 2. Lobby (US2)

1. Create a game as host with three computer seats: each row shows a skill select and a risk select, both preselected "Medium".
2. Set seat 1 to Hard / No risk, seat 2 to Easy / High risk, seat 3 to Random / Random. Switch the language: all labels are translated.
3. Start the game. A second browser sees the same seat settings in the lobby before the start.

## 3. Behaviour (US1, US3, US5)

1. Watch the Hard / No risk computer: after a Volle Lotte on a Bonus card it banks every time.
2. Watch the Easy / High risk computer: it plays visibly simpler and draws on often.
3. Watch the Random / Random computer over several turns: its play varies from decision to decision.
4. Leave as a second human: the replacing computer plays with random skill and risk and the seat shows "Random".

## 4. Load (no backend regression)

Run `npm run test:e2e` (manual, `run-e2e`) with several rooms of eight computers each: no increase in websocket messages per move compared with `main`, no event-loop stalls on the first decision.
