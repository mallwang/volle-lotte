import type { ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { GameView, SeatView } from 'game-rules';
import { defaultRules } from 'game-rules';

/** Test helpers (specs only). */
export function stubSocket(game: GameView | null = null) {
  return {
    session: signal({ playerId: 'p0', nickname: 'Ann' }),
    games: signal([]),
    game: signal(game),
    storedNickname: '',
    send: vi.fn(),
    start: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    settings: vi.fn(),
  };
}

export function gameView(over: Partial<GameView> = {}, seats: SeatView[] = []): GameView {
  const open: SeatView = { state: 'open' };
  return {
    id: 'g1',
    name: 'Test',
    phase: 'lobby',
    rules: defaultRules(),
    hostId: 'p0',
    you: { playerId: 'p0', seat: 0 },
    seats: [...seats, ...Array.from({ length: 4 - seats.length }, () => open)],
    pending: [],
    graceEndsAt: {},
    fastComputerDice: false,
    log: [],
    ...over,
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
