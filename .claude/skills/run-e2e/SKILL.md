---
name: run-e2e
description: Run the slow end-to-end tests (full games with bots over real sockets, disconnect and cleanup flows) manually. Use when the user asks to run e2e tests or to verify multiplayer behaviour end to end. Never part of CI or the pre-push hook.
disable-model-invocation: true
---

# Run the end-to-end tests

End-to-end tests are kept apart from the unit tests on purpose: they take about 30 s, so CI, the pre-push hook and `npm run test` skip them. Only the user starts them, through this skill.

## Run

```bash
npm run test:e2e
```

- Currently: `apps/backend/src/app/lobby/*.e2e.spec.ts` (Jest, `jest.e2e.config.cts`, run in band).
- They start the NestJS lobby module on a random port and play with real Socket.IO clients. No browser, no running dev server needed.
- Single test: `npx jest -c apps/backend/jest.e2e.config.cts -t "<name>"`.

## What they cover

Full games with 2 and 8 human clients and with computers, identical state on all clients, rejected actions without a push, parallel games, disconnect warning and exact state on reconnect, computer takeover after the grace period, rejoin, host handover, lobby cleanup after 15 min and running cleanup after 24 h.

Timers are compressed in the test: `setTimeout` is replaced only for calls made by `game-room` and `game-registry` (grace 30 s, cleanups, computer pacing).

## Conventions

- New e2e files are named `*.e2e.spec.ts` (the unit `test` target ignores them) and share `testing/client.ts`.
- Report failures with the output; do not "fix" a flaky test by raising timeouts without understanding the cause (an earlier stall was a bug in the test bot, not in the app).
- UI checks in a real browser are a separate topic: see `verify-ui` and the roadmap item "E2E suite with bots".
