# Data Model: Multi-language support (i18n)

## Language

A supported UI language. Static list in the frontend; no server data.

| Field  | Type           | Notes                                                  |
| ------ | -------------- | ------------------------------------------------------ |
| `code` | `'en' \| 'de'` | Base language code, also used for `<html lang>`        |
| `name` | string         | Native name shown in the select ("English", "Deutsch") |
| `flag` | string         | Decorative flag emoji (🇬🇧, 🇩🇪)                         |

Adding a language = new entry here + new dictionary (FR-014).

## Translation dictionary

Flat map `key -> string` per language. `en` is the source and defines the key type; `de` must have the identical key set. Values may contain `{param}` placeholders.

Validation rules:

- Missing key at runtime in the active language → English text (FR-007); missing in English too → the key itself (visible in tests, never expected in production).
- Parity test: `keys(de) == keys(en)`; placeholders per key identical.

## Language preference

| Field         | Where          | Rules                                                         |
| ------------- | -------------- | ------------------------------------------------------------- |
| `vl-language` | `localStorage` | One of the supported codes; anything else is ignored (FR-006) |

State transitions:

1. No valid stored value → derive from `navigator.languages`, else `en` (not stored).
2. User selects a language → signal updates, value stored (if storage works).
3. Later visit → stored value wins over browser language.
