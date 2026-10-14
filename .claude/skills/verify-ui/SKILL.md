---
name: verify-ui
description: Verify a UI change in the real app with Playwright — app URLs, selector conventions, and a throw-away script template. Use whenever a frontend change (component, route, string, style) needs visual/functional confirmation, instead of relying on unit tests or code reading alone.
---

# Verify UI changes with Playwright

There is no committed Playwright e2e suite. UI verification means writing a **throw-away script**
against the running app. Don't create `*.e2e-spec.ts` files or a `playwright.config.ts` unless the
user explicitly asks for a real e2e suite.

## 1. Get the app running

```bash
npm run dev   # nx run-many -t serve -p backend frontend
```

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000` (API under `/api`, Socket.IO under `/socket.io`)
- Wait for both `serve` targets to report ready before driving the browser.
- If something is already listening on 4200/3000, reuse it. Stuck processes: `/stop-dev`.

## 2. Navigate and assert

The app has no accounts in release 1 (anonymous nickname + token), so there is no login step.
Read the current routes from `apps/frontend/src/app/app.routes.ts` instead of assuming them.

Selector conventions, most to least preferred:

1. `[data-testid="..."]` — add one to interactive elements that have no other stable selector.
2. A stable DOM id/attribute.
3. Role locators (`page.getByRole('button', { name: /.../ })`).
4. Avoid matching on visible text as the only signal.

Multiplayer flows: use one `browser.newContext()` per player (separate `localStorage`).

Take a screenshot as evidence for visual changes:

```js
await page.screenshot({ path: '/tmp/verify.png', fullPage: true });
```

## 3. Script template

Copy [templates/verify-template.mjs](templates/verify-template.mjs) into your scratchpad directory,
edit the "EDIT ME" section and run `node <scratchpad>/verify.mjs`. Close the browser in `finally`.

Don't commit the script or screenshots. If the change warrants a permanent e2e test, say so and ask
before scaffolding one with `@nx/playwright`.
