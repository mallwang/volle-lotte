# Test Coverage Guide

Drives the `/speckit-coverage` audit. Principle: test logic, not wiring. Target: 80% statements per project.

## Always skip

- `**/main.ts` (bootstrap), `**/app.config.ts`, `**/app.routes.ts` (wiring/config)
- Socket traffic measurement tooling: `**/testing/traffic.ts`, `**/testing/autoplay.ts`, `**/measure/**` (run by `npm run measure:socket`, not part of the test suite)
- Pure data/constant files and components whose body is only a template

## Always test

- Services, guards, resolvers, pipes with logic, gateways/controllers with logic
- Components with class methods beyond lifecycle hooks
- All of `libs/game-rules` (pure game logic; the highest-value tests in the repo)
