import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type ActivatedRouteSnapshot } from '@angular/router';
import { encodeView } from 'game-rules';
import { MobileSocketService, STORAGE_KEY } from './mobile-socket.service';
import { membershipGuard, sessionGuard } from './session.guard';
import { fakeSocket, gameView } from './testing';

const run = <T>(fn: () => T) => TestBed.runInInjectionContext(fn);
const url = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);
const route = (id: string) =>
  ({ paramMap: { get: () => id } }) as unknown as ActivatedRouteSnapshot;

describe('guards', () => {
  beforeEach(() => localStorage.clear());

  it('sends a visitor without a stored identity to the nickname screen', async () => {
    fakeSocket();
    expect(url(await run(() => sessionGuard({} as never, {} as never)))).toBe('/nickname');
  });

  it('lets a resumed or signed-in user pass', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 't', nickname: 'Anna' }));
    fakeSocket({ 'session:start': { ok: true, token: 't', playerId: 'p0', nickname: 'Anna' } });
    expect(await run(() => sessionGuard({} as never, {} as never))).toBe(true);
    expect(await run(() => sessionGuard({} as never, {} as never))).toBe(true);
  });

  it('keeps game/:id for members of that game only', async () => {
    fakeSocket({
      'session:start': {
        ok: true,
        token: 't',
        playerId: 'p0',
        nickname: 'A',
        game: encodeView(gameView()),
      },
    });
    expect(url(run(() => membershipGuard(route('g1'), {} as never)))).toBe('/');
    await TestBed.inject(MobileSocketService).start('A');
    expect(run(() => membershipGuard(route('g1'), {} as never))).toBe(true);
    expect(url(run(() => membershipGuard(route('other'), {} as never)))).toBe('/');
  });
});
