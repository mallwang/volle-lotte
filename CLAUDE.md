# Volle Lotte (web app)

Read [docs/migration.md](docs/migration.md) first: project goal, decisions made, porting map and next steps.
Game rules: [docs/rules.md](docs/rules.md). Workflow: Spec-Kit (`/speckit-*`); principles in [.specify/memory/constitution.md](.specify/memory/constitution.md).
The Java reference lives as a copy in `tmp/java/` (git-ignored, read-only).

## Language

- All documentation (README, `docs/`, specs, plans, code comments), commit messages, pull request titles and descriptions, and issues **must be written in English**.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, imperative, max ~72 chars.
- Conversation with the user may be in German.

## Workspace

- Nx monorepo (npm workspaces): `apps/frontend` (Angular), `apps/backend` (NestJS), `libs/game-rules` (shared). Use npm >= 11 (`packageManager` in `package.json`).
- Run everything through Nx: `npm run dev|build|test|lint|typecheck`. Module boundaries are enforced via `scope:*` tags.
- Git hooks (husky): pre-commit runs lint-staged (secretlint, eslint, prettier); pre-push runs affected typecheck and tests.
- Spec-Kit git extension hooks auto-commit around each `/speckit-*` phase; `/speckit-format` runs before those commits.
- Releases: `npm run release` (Nx Release, conventional commits, fixed version).

<!-- SPECKIT START -->

Current feature plan: [specs/001-rules-engine/plan.md](specs/001-rules-engine/plan.md)
<!-- SPECKIT END -->
