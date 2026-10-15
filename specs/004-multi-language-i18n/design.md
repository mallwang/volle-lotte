# Design: Language select

**Mockup**: [mockup.html](mockup.html) (static, non-functional, local file; no Artifact link because the Artifact tool was unavailable).

## Approved layout

App bar: logo (left), language select, theme toggle (right). The select sits directly left of the theme toggle on every screen showing the app bar (US2, FR-003).

```
[Volle Lotte]                 [🇬🇧 English ▾] [Auto|Light|Dark]   desktop
[Volle Lotte]                       [🇬🇧 ▾] [Auto|Light|Dark]   mobile
```

- **Desktop**: flag plus language name; dropdown menu with one entry per language (flag + name), active entry highlighted.
- **Mobile**: flag only; the accessible name stays the language name, e.g. "Language: English" / "Sprache: Deutsch" (FR-009).
- **Dropdown, not a segmented button**: scales to further languages (FR-014).
- Switching updates all texts immediately, including the select's own label (US2, FR-004).
- Look follows the approved Terracotta tokens of [003 design](../003-ui-foundation-primeng/design.md), light and dark.

## Out of scope for the mockup

Translated wording of all screens, server messages (FR-008), storage and browser detection (FR-002, FR-005, FR-006), READMEs, user guides and docs skill (FR-011..FR-013). PrimeNG is the toolkit, so details come from its select component; layout and mobile behaviour are binding.
