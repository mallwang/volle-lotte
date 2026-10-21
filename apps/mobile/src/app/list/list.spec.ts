import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { GameSummary } from 'game-rules';
import { MobileSocketService } from '../core/mobile-socket.service';
import { fakeSocket } from '../core/testing';
import { List } from './list';

const game = (over: Partial<GameSummary>): GameSummary => ({
  id: 'g1',
  name: 'Table',
  host: 'Anna',
  targetScore: 1000,
  seatsUsed: 1,
  seatsTotal: 4,
  protected: false,
  rejoinable: false,
  banned: false,
  closable: false,
  phase: 'lobby',
  spectatable: false,
  ...over,
});

function render(games: GameSummary[]) {
  fakeSocket();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  TestBed.inject(MobileSocketService).games.set(games);
  const fixture = TestBed.createComponent(List);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}
const buttons = (el: HTMLElement) =>
  [...el.querySelectorAll('li button')].map((b) => b.textContent?.trim());

describe('List', () => {
  it('shows the empty state and the create link', () => {
    const el = render([]);
    expect(el.textContent).toContain('No open games');
    expect(el.querySelector('a[href="/create"]')).not.toBeNull();
  });

  it('offers only the applicable action per game', () => {
    const el = render([
      game({ id: 'a' }),
      game({ id: 'b', seatsUsed: 4 }),
      game({ id: 'c', banned: true }),
      game({ id: 'd', phase: 'running' }),
      game({ id: 'e', phase: 'running', rejoinable: true }),
    ]);
    expect(buttons(el)).toEqual(['Join', 'Rejoin']);
    expect(el.textContent).toContain('Full');
    expect(el.textContent).toContain('Running');
    expect(el.querySelectorAll('[role=alert]')).toHaveLength(1);
  });

  it('offers the way back into the game the player is seated in', () => {
    fakeSocket();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const socket = TestBed.inject(MobileSocketService);
    socket.games.set([game({ id: 'mine', phase: 'running' })]);
    socket.game.set({ id: 'mine' } as never);
    const fixture = TestBed.createComponent(List);
    fixture.detectChanges();
    expect(buttons(fixture.nativeElement)).toEqual(['Rejoin']);
  });

  it('opens the table of the running game the player is seated in', () => {
    fakeSocket();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const socket = TestBed.inject(MobileSocketService);
    socket.games.set([game({ id: 'mine', phase: 'running' })]);
    socket.game.set({ id: 'mine' } as never);
    const fixture = TestBed.createComponent(List);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(nav).toHaveBeenCalledWith('/table/mine');
  });
});
