# Volle Lotte (web app)

Read [docs/roadmap.md](docs/roadmap.md) first: what is done, what is next. The finished Java migration (goal, decisions, porting map) is recorded in [docs/migration.md](docs/migration.md).
Game rules: [docs/rules.md](docs/rules.md). Workflow: Spec-Kit (`/speckit-*`); principles in [.specify/memory/constitution.md](.specify/memory/constitution.md).
The Java reference lives as a copy in `tmp/java/` (git-ignored, read-only).

## Language

- All documentation (README, `docs/`, specs, plans, code comments), commit messages, pull request titles and descriptions, and issues **must be written in English**.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, imperative, max ~72 chars.
- Conversation with the user may be in German.

## Workspace

- Nx monorepo (npm workspaces): `apps/frontend` (Angular), `apps/backend` (NestJS), `libs/game-rules` (shared). Use npm >= 11 (`packageManager` in `package.json`).
- Run everything through Nx: `npm run dev|build|test|lint|typecheck`. `npm run test:e2e` (slow end-to-end flows, manual via the `run-e2e` skill) is not part of CI or the hooks. Module boundaries are enforced via `scope:*` tags.
- Git hooks (husky): pre-commit runs lint-staged (secretlint, eslint, prettier); pre-push runs affected typecheck and tests.
- Spec-Kit git extension hooks auto-commit around each `/speckit-*` phase; `/speckit-format` runs before those commits.
- Releases: `npm run release` (Nx Release, conventional commits, fixed version).

<!-- SPECKIT START -->

Current feature plan: [specs/011-computer-ai-rework/plan.md](specs/011-computer-ai-rework/plan.md)
<!-- SPECKIT END -->
