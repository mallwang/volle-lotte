# Quickstart: validating multi-language support

Prerequisites: `npm install`, then `npm run dev`.

1. **Browser default (SC-004)**: clear `vl-language` in DevTools, set the browser language to German, reload. UI is German and `<html lang="de">`. Set it to French: UI is English.
2. **Switch (SC-002)**: use the language select next to the theme selector; texts change immediately, no reload, current screen state is kept. Check a lobby, the table and an error toast (e.g. wrong password).
3. **Persistence (SC-003)**: choose German, reload; still German. Set `vl-language` to `xx`, reload; falls back to the browser language.
4. **Storage blocked (FR-006)**: block site data, reload; app works, switching works for the page view.
5. **Accessibility (SC-006)**: Tab to the select, open with Enter, choose with arrows, confirm; screen reader announces "Language"/"Sprache" and the option name.
6. **Parity**: `npm test` runs the dictionary parity test.
7. **Docs (SC-005)**: `README.md` ↔ `README.de.md`, `docs/user-guide.md` ↔ `docs/user-guide.de.md` link each other and have the same headings.
