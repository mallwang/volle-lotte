// Throw-away Playwright verification script.
// Copy this into your scratchpad, fill in the "EDIT ME" section, and run:
//   node <scratchpad>/verify.mjs
// Requires the app already running: `npm run dev` (frontend :4200, backend :3000).

import { chromium } from 'playwright';

const FRONTEND_URL = 'http://localhost:4200';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();

  // ---- EDIT ME: navigate to and assert on the thing you're verifying ----
  await page.goto(FRONTEND_URL);
  await page.screenshot({ path: '/tmp/verify.png', fullPage: true });
  console.log('OK — screenshot at /tmp/verify.png');
  // -------------------------------------------------------------------------
} finally {
  await browser.close();
}
