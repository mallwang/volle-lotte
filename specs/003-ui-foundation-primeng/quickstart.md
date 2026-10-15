# Quickstart: validating the UI foundation

## Prerequisites

- Node >= 22, npm >= 11, `npm install` after the Angular 22.1 / PrimeNG dependency bump.

## Automated checks

```bash
npm run lint && npm run typecheck && npm run test && npm run build
npm run test:coverage   # frontend stays >= 80%
```

Expect: contrast test passes for all preset token pairs (light and dark); `axe-core` specs report no serious or
critical violations per screen; build stays within the budgets in `apps/frontend/project.json` (adjust the initial
budget only if PrimeNG needs it, and note it in the PR).

## Manual scenarios

1. **Theme (US1)**: `npm run dev`. Set the OS to dark, open the app -> dark. Use the header toggle to choose light,
   reload -> stays light. Clear `vl-theme` in storage -> follows the OS again.
2. **Layout (US1, SC-005)**: In dev tools check 320, 360, 768 and 1280 px on every screen: no horizontal scrollbar.
3. **Lobby flow (US2)**: Two browsers: nickname -> create game (invalid values show inline errors) -> join with
   password dialog -> ready -> start. Non-host sees no host controls.
4. **Full game (US3, SC-002)**: Play 2 players, then 8 (mix of humans and computers) to the ranked result on a phone
   viewport and on desktop. Each of select / throw / bank takes at most 2 taps.
5. **Disconnect (US4)**: Close one player's tab: others see the countdown; after the grace period the host gets the
   dialog (computer or free seat), others a waiting notice. Stop the backend: offline notice appears, disappears on
   restart.
6. **Keyboard and motion (US5)**: Play a turn with keyboard only; dialogs trap and restore focus. Enable
   "reduce motion" in the OS: transitions are skipped.
7. **Screen reader (US5)**: With NVDA/VoiceOver, new log entries are announced without moving focus.
