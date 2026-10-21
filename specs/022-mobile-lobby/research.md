# Research: Mobile lobby and game setup

## Repository Reuse Assessment

| Concern                                                                                  | Existing code                                                                                | Decision                                                                    |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Wire protocol, `applyChange`, `decodeView`, intent/push types                            | `libs/game-rules`                                                                            | Reuse as is.                                                                |
| Setup model (`Setup`, `defaultSetup`, `sanitizeSetup`, `setupFromGame`, `planComputers`) | `apps/frontend/src/app/core/setup.ts`, pure, imports only `game-rules`                       | Move to a new `scope:shared` lib `client-core`.                             |
| Translations (`en`, `de`)                                                                | `apps/frontend/src/app/i18n/`                                                                | Move to `client-core`; mobile adds its own few keys on top.                 |
| Socket client, session, lobby/game signals                                               | `apps/frontend/.../socket.service.ts`, coupled to PrimeNG `MessageService` and `I18nService` | Do not extract. Thin mobile service (see R2).                               |
| Components (`nickname`, `lobby`, `create-game`, `game-lobby`, `host-settings`)           | desktop, PrimeNG, desktop layout                                                             | Not reusable on narrow screens; mobile gets its own components (design.md). |
| Presets (`setup-store`, preset dialogs)                                                  | desktop                                                                                      | Deferred (see R6).                                                          |

## R1. How mobile shares logic across the Nx boundary

- **Decision**: New library `libs/client-core` (`scope:shared`, copy of the `computer-names` layout) holding `setup.ts` (+ its spec) and the `en`/`de` dictionaries (+ the dictionary parity spec). Desktop imports from `client-core`; files are moved with `git mv`, specs keep their expectations.
- **Rationale**: Mobile may only depend on `scope:shared`. These two pieces are pure, framework-free and the only ones where duplication would drift (setup rules, translated text). FR-012 asks for shared translations.
- **Alternatives**: Copy into `apps/mobile` (drifts, two key sets to keep in step). Move into `game-rules` (it is the rules engine, not client text). Extract the whole socket service (needs a toast/i18n abstraction for one extra consumer; the second client has different notification needs).

## R2. Socket and session on mobile

- **Decision**: Replace the M0 `MobileConnectionService` internals with a `MobileSocketService` that keeps the same `online` signal and `MOBILE_SOCKET` token and adds: `session`, `games`, `game`, `send`, `start`/`resume`/`replay` of `session:start`, and the pushes `lobby:games`, `game:snapshot`, `game:change`, `game:settingsChanged`, `game:closed`, `session:replaced`. Same storage key `volle-lotte.session` as desktop, so one browser keeps one identity. Errors surface as an inline banner signal instead of toasts.
- **Rationale**: Mirrors the desktop behavior (FR-001, FR-015) with about a third of its code: no match, replay-log, spectate or rematch paths (M2/M3).
- **Alternatives**: Share the desktop service (PrimeNG coupling, pulls match concerns). Different storage key (a player would need two nicknames).

## R3. Routing under `/m/`

- **Decision**: Hash-free router with `baseHref` `/m/`: `''` (game list), `nickname`, `create`, `game/:id` (lobby), `started` (game-started notice). `sessionGuard` equivalent redirects to `nickname` without a session, resuming a stored session first. Unknown paths redirect to the list.
- **Rationale**: Same shape as desktop; the backend already serves the mobile SPA with fallback (M0).
- **Alternatives**: Single page without routes (no back button support, which phones rely on).

## R4. UI approach

- **Decision**: Plain CSS with the terracotta theme variables and 44 px touch targets; no component library. Layout switches by container width/orientation media queries (`@media (orientation: landscape)`), not device sniffing. Joining uses a native `<dialog>`; settings collapse with `<details>`; sliders and toggles are native `input`s.
- **Rationale**: Ponytail ladder: native platform before library. PrimeNG would add bundle weight against the 500 kB budget and desktop-styled widgets. design.md says only layout, hierarchy and states are binding.
- **Alternatives**: PrimeNG (consistent with desktop, heavier, desktop-oriented overlays).

## R5. Support matrix

- **Decision**: Current Chrome (Android) and Safari (iOS). Portrait 320-480 px wide; landscape 568-932 px wide, 320-430 px high. Verified by browser device emulation plus one real-phone check on the test instance.
- **Rationale**: Matches the spec assumption and covers common phones from small to large.
- **Alternatives**: Older WebViews (not needed until the Capacitor milestone M5).

## R6. Presets and per-card-type options

- **Decision**: Presets are deferred; the create form always starts from `defaultSetup()`. Per-card-type options are included only as far as the host settings already exposed by `game:settings` and the create payload. Record the deferral in `docs/mobile-roadmap.md`.
- **Rationale**: The preset store, dialogs and rename flows need separate narrow-screen design that the approved mockup does not include (spec assumption allows deferral). Skipping them keeps M1 shippable.
- **Alternatives**: Port presets now (three dialogs, local storage handling, more design work).

## R7. Testing

- **Decision**: Unit tests per mobile component and the socket service using the repo's Angular unit-test target, with a fake socket (same pattern as the M0 spec); the moved specs run in `client-core`. Desktop suites run unchanged (SC-005). Manual viewport and real-phone checks follow `quickstart.md`.
- **Rationale**: Constitution III (80 % coverage) and existing conventions.
- **Alternatives**: Playwright mobile e2e (slow, out of CI by project rule; can use the existing `run-e2e` skill manually).
