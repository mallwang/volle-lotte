import type { ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { GameView } from 'game-rules';
export { gameView } from 'client-core';

/** Test helpers (specs only). */
export function stubSocket(game: GameView | null = null) {
  return {
    session: signal({ playerId: 'p0', nickname: 'Ann' }),
    online: signal(true),
    games: signal([]),
    game: signal(game),
    storedNickname: '',
    send: vi.fn(),
    start: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
    rejoin: vi.fn(),
    spectate: vi.fn(),
    end: vi.fn(),
    refreshLobby: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn(),
    rematch: vi.fn().mockResolvedValue(true),
    rejoinRematch: vi.fn().mockResolvedValue(true),
    settings: vi.fn().mockResolvedValue({ ok: true }),
  };
}

/** Fails the test on any axe violation in the rendered fixture (WCAG A/AA rules). */
export async function expectNoA11yViolations(fixture: ComponentFixture<unknown>): Promise<void> {
  const axe = (await import('axe-core')).default;
  const results = await axe.run(fixture.nativeElement as HTMLElement, {
    runOnly: ['wcag2a', 'wcag2aa'],
    // jsdom has no layout/paint, so colour contrast is covered by the preset contrast spec.
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** Renders the fixture once per colour mode (class `app-dark` on <html>) and runs the check. */
export async function inBothModes(fixture: ComponentFixture<unknown>, check: () => Promise<void>) {
  const run = async (dark: boolean) => {
    document.documentElement.classList.toggle('app-dark', dark);
    fixture.detectChanges();
    await check();
  };
  await run(false);
  await run(true);
  document.documentElement.classList.remove('app-dark');
}
