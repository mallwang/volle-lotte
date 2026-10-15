# Research: Multi-language support (i18n)

## 1. Runtime i18n mechanism

**Decision**: Hand-rolled `I18nService` (signal `lang`, `t(key, params)`) with typed TypeScript dictionaries `en.ts` / `de.ts` bundled into the app.

**Rationale**:

- FR-004 needs instant switching without reload, which rules out build-time `@angular/localize` (one bundle per locale).
- Needs are tiny: two languages, flat keys, simple `{param}` interpolation (e.g. attempts left, seconds). Transloco/ngx-translate add a dependency, an HTTP loader and async loading states for something ~60 lines cover; Constitution VII requires a concrete need for new dependencies.
- Typing `de` as the shape of `en` gives compile-time detection of missing/extra keys (SC-001), and a parity test double-checks it.
- Bundled dictionaries avoid a network round trip and flash of untranslated content.
- FR-014 holds: adding a language means one new dictionary file and one entry in the language list.

**Alternatives considered**:

- Transloco (`@jsverse/transloco`): signal-friendly, runtime switching, `provideTransloco` with `fallbackLang`, optional persist plugin. Good fit, but needs an HTTP loader and a dependency for no feature we use (no plurals, no scopes, no lazy loading). Revisit if plural rules or many languages appear.
- ngx-translate: same trade-off, older API.
- `@angular/localize`: build-time, no instant switch. Rejected.

**Known ceiling**: no ICU plural/gender rules. Texts needing plurals use two keys (`one`/`other`) chosen by the caller. Upgrade path: swap `I18nService` internals for Transloco; templates keep the `t` pipe.

## 2. Language detection and persistence

**Decision**: Order is stored value (`vl-language`, valid only if supported) → `navigator.languages` first supported base language (`de-AT` → `de`) → `en`. Persist on explicit user choice only (so browser changes still apply until the user chooses). Storage access wrapped in try/catch like `ThemeService`.

**Rationale**: Mirrors the existing theme pattern (FR-002, FR-005, FR-006).

## 3. `<html lang>` and pre-paint

**Decision**: An `effect` sets `document.documentElement.lang` from the signal (FR-010). The theme pre-paint script in `index.html` is not needed for texts because the app renders client-side after bootstrap; only `lang` is set early by the service at construction.

## 4. Backend messages (FR-008)

**Decision**: No backend change. The backend already returns reason codes (`ErrorReason` in `libs/game-rules/src/lib/protocol.ts`); `error-message.ts` maps them to dictionary keys (`error.<reason>`) with params for `attemptsLeft`, `retryAfterMs`, and `engine`. Engine rejection details (`engine`) stay a technical code appended as before.

**Rationale**: Keeps server language-agnostic and the engine pure.

## 5. Language select

**Decision**: PrimeNG `p-select` (dropdown, not segmented button, per design.md) with flag emoji + name; flag `aria-hidden`, accessible name "Language"/"Sprache" via `ariaLabel`; mobile shows flag only with the language name as accessible label.

## 6. Documentation

**Decision**: Follow Vaultfolio: `README.de.md`, `docs/user-guide.md` (English), `docs/user-guide.de.md`. The docs skill treats each pair as a unit (scope list, impact-table rows, "update both together").
