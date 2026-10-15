# Feature Specification: Multi-Language Support (German & English)

**Feature Branch**: `004-multi-language-i18n`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Multi-language support: browser language as default, per-user language select with flags next to the theme selector, persisted locally, README.de.md, user guide in German and English, review of the docs skill for bilingual docs."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - App follows my browser language (Priority: P1)

A player opens the app for the first time. The whole interface appears in German if their browser prefers German, otherwise in English.

**Why this priority**: Core value — players understand the UI without any setup.

**Independent Test**: Open the app with the browser set to German, then to French; verify German UI and English UI respectively.

**Acceptance Scenarios**:

1. **Given** no saved language choice and a browser preferring German, **When** the app loads, **Then** all UI texts are German.
2. **Given** no saved language choice and a browser preferring an unsupported language (e.g. French), **When** the app loads, **Then** all UI texts are English.
3. **Given** a browser with a regional variant (e.g. de-AT), **When** the app loads, **Then** German is used.

---

### User Story 2 - Switch language manually (Priority: P1)

A player changes the language via a select showing flags, placed next to the theme selector. The interface switches immediately without losing the current state (nickname, lobby, running game).

**Why this priority**: Browser language is not always the player's preference; required to complete the feature.

**Independent Test**: Use the select to switch between German and English on every screen; verify texts change instantly and the game state is kept.

**Acceptance Scenarios**:

1. **Given** the app in English, **When** the player selects the German flag entry, **Then** all visible texts become German immediately and no reload or data loss occurs.
2. **Given** a running game, **When** the player switches the language, **Then** the game continues unchanged and other players are unaffected.
3. **Given** the select, **When** it is operated by keyboard or screen reader, **Then** each option is reachable and announced with its language name (not only the flag).

---

### User Story 3 - My choice is remembered (Priority: P2)

The chosen language is stored on the player's device and used on the next visit, taking precedence over the browser language.

**Why this priority**: Avoids repeated switching, but the feature works without it.

**Independent Test**: Choose a language, reload the page and reopen the app; verify the choice is kept even if it differs from the browser language.

**Acceptance Scenarios**:

1. **Given** the player chose English with a German browser, **When** the page is reloaded, **Then** the UI is English.
2. **Given** a stored value that is invalid or unsupported, **When** the app loads, **Then** it is ignored and the browser-language rule applies.
3. **Given** local storage is unavailable, **When** the player switches language, **Then** the switch still works for the current session without errors.

---

### User Story 4 - Bilingual documentation (Priority: P2)

Visitors of the repository can read the README in German (`README.de.md`) and English, and find a user guide in both languages explaining how to play and use the app. Both READMEs link to each other.

**Why this priority**: Completes the localisation for non-developers; independent of the UI work.

**Independent Test**: Open `README.md` and `README.de.md`, follow the language links and the user-guide links; verify content parity.

**Acceptance Scenarios**:

1. **Given** the English README, **When** a reader looks for a German version, **Then** a visible link leads to `README.de.md` (and vice versa).
2. **Given** the user guide, **When** a reader opens it, **Then** it exists in German and English with the same structure and covers creating/joining a game, playing a round and changing language and theme.

---

### User Story 5 - Docs skill supports bilingual docs (Priority: P3)

The project's docs update skill keeps German and English documents in sync after future implementations.

**Why this priority**: Maintenance concern; prevents the translations from drifting.

**Independent Test**: Run the docs skill after a change affecting a user-visible feature; verify both language versions are reviewed and updated.

**Acceptance Scenarios**:

1. **Given** a feature changing documented behaviour, **When** the docs skill runs, **Then** the English and German variants of every affected document (README, user guide) are updated together.

---

### Edge Cases

- Browser reports several preferred languages (e.g. `fr, de;q=0.8`): the first supported one wins; if none, English.
- Text with dynamic parts (player names, counts, pluralisation) reads correctly in both languages.
- A translation is missing for a key: the English text is shown instead of a raw key.
- Messages originating from the server (e.g. validation or game errors) are shown in the player's selected language.
- Language changes while a dialog, toast or error message is visible: it updates too.
- Different players in the same game use different languages without affecting each other.
- Dates/numbers shown in the UI follow the selected language.
- The page's declared document language reflects the selection (accessibility, search engines).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support German and English for all user-visible UI texts (screens, buttons, labels, errors, notifications, tooltips, accessible names).
- **FR-002**: On first visit, System MUST select the language from the browser's preferred languages (first supported match, regional variants map to their base language), falling back to English.
- **FR-003**: System MUST provide a language select with a flag and language name per option, placed next to the theme selector and visible on every screen where the theme selector is shown.
- **FR-004**: Changing the language MUST apply immediately without page reload and without losing current state.
- **FR-005**: System MUST persist the chosen language on the user's device and prefer it over the browser language on later visits.
- **FR-006**: System MUST ignore invalid or unsupported stored values and keep working if storage is unavailable.
- **FR-007**: System MUST fall back to English text when a translation is missing.
- **FR-008**: Server-originated user-facing messages MUST be presented in the selected language.
- **FR-009**: The language select MUST be fully keyboard- and screen-reader-accessible; flags MUST NOT be the only identifier.
- **FR-010**: The document language attribute MUST reflect the active language.
- **FR-011**: The repository MUST contain `README.de.md` with content equivalent to `README.md`, and both MUST link to each other.
- **FR-012**: The repository MUST contain a user guide in German and English with equivalent content, linked from both READMEs.
- **FR-013**: The docs update skill MUST treat German and English variants of README and user guide as a pair and update both when one is affected.
- **FR-014**: Adding a further language later MUST NOT require changes to screen logic (only translations and the language list).

### Key Entities

- **Language**: A supported UI language (code, display name, flag). Initially German and English.
- **Language preference**: The player's explicitly chosen language, stored on their device; absent until the player chooses.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of user-visible texts on all screens appear in the selected language (no mixed-language screens, no raw keys) in both languages.
- **SC-002**: A player can switch language in at most 2 interactions and sees the change in under 1 second.
- **SC-003**: After choosing a language, 100% of subsequent visits on the same device start in that language.
- **SC-004**: A first-time visitor with a German or English browser sees their language without any interaction.
- **SC-005**: German and English READMEs and user guides cover the same sections (100% structural parity).
- **SC-006**: The language select passes the project's accessibility checks (keyboard operation, announced names).

## Assumptions

- Supported languages are German and English only; English is the fallback and the source language.
- The preference is stored per device/browser only; there are no user accounts and no server-side storage of the language.
- Game rules content in `docs/rules.md` and the internal docs (`docs/migration.md`, specs) stay English-only; only README and user guide are bilingual.
- Card/game-specific terms are translated consistently using the terminology of `docs/rules.md`.
- The user guide mirrors the structure of the one in the Vaultfolio project (location and layout follow that project's convention, e.g. `docs/user-guide.md` (English) and `docs/user-guide.de.md` (German)).
- Flags are decorative; language names remain the accessible label.
- Findings on the docs skill: it currently scopes only `README.md`, `libs/*`, `apps/*`, and `docs/**/*.md` and has no notion of language variants. It needs a pairing rule (see FR-013) and `README.de.md`/user guides added to its scope.
