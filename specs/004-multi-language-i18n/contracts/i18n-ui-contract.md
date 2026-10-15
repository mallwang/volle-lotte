# UI & Service Contract: Language selection

No backend or network contract changes; the Socket.IO protocol is unchanged (reason codes only).

## `I18nService` (frontend, `core/i18n.service.ts`)

- `lang: Signal<LanguageCode>`: active language.
- `languages: readonly Language[]`: selectable list (see [data-model.md](../data-model.md)).
- `set(code)`: switches immediately, persists to `vl-language`; storage errors are swallowed.
- `t(key, params?) : string`: active dictionary, falls back to English, then the key; `{name}` placeholders replaced from `params`.
- Side effect: `document.documentElement.lang` equals `lang()` at all times.

## `t` pipe

`{{ 'nickname.title' | t }}` and `{{ 'error.wrongPassword' | t: { attemptsLeft: n } }}`; re-evaluates when `lang` changes.

## Language select (app header)

- Placement: left of the theme selector, on every screen showing the theme selector (see [design.md](../design.md)).
- Options: flag (decorative, `aria-hidden`) + native name; value = language code.
- Accessible name: "Language" / "Sprache" (translated); on narrow viewports only the flag is visible but the name stays available to assistive tech.
- Keyboard: PrimeNG `p-select` behaviour (focus, Enter/Space/Arrows, Esc).
- Selection takes effect without reload and without losing app state.

## Storage

`localStorage['vl-language']` ∈ `{'en','de'}`; invalid or unreadable → ignored.
