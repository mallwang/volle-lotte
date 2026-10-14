# Test Coverage Guide

Drives the `/speckit-coverage` audit. Principle: test logic, not wiring. Target: 80% statements per project.

## Always skip

- `**/main.ts` (bootstrap), `**/app.config.ts`, `**/app.routes.ts` (wiring/config)
- Pure data/constant files and components whose body is only a template

## Always test

- Services, guards, resolvers, pipes with logic, gateways/controllers with logic
- Components with class methods beyond lifecycle hooks
- All of `libs/game-rules` (pure game logic; the highest-value tests in the repo)
