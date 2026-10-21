import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { encodeView, type GameSummary } from 'game-rules';
import { fakeSocket, gameView } from '../core/testing';
import { JoinDialog } from './join-dialog';

const summary = { id: 'g1', name: 'Test', protected: true } as GameSummary;

function setup(acks: Record<string, object>) {
  const { emit } = fakeSocket(acks);
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(JoinDialog);
  fixture.componentRef.setInput('game', summary);
  const closed = vi.fn();
  fixture.componentInstance.closed.subscribe(closed);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const submit = async (password: string) => {
    (el.querySelector('input') as HTMLInputElement).value = password;
    el.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { emit, nav, closed, el, submit };
}

describe('JoinDialog', () => {
  it('joins with the password and opens the lobby', async () => {
    const { emit, nav, submit } = setup({
      'game:join': { ok: true, game: encodeView(gameView({ id: 'g1' })) },
    });
    await submit('secret');
    expect(emit).toHaveBeenCalledWith(
      'game:join',
      { gameId: 'g1', password: 'secret' },
      expect.any(Function),
    );
    expect(nav).toHaveBeenCalledWith(['/game', 'g1']);
  });

  it('keeps the dialog open on a wrong password', async () => {
    const { el, closed, submit } = setup({
      'game:join': { ok: false, reason: 'wrongPassword', attemptsLeft: 2 },
    });
    await submit('nope');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('2 attempts left');
    expect(closed).not.toHaveBeenCalled();
  });

  it('closes with the message when the game is full', async () => {
    const { closed, submit } = setup({ 'game:join': { ok: false, reason: 'gameFull' } });
    await submit('x');
    expect(closed).toHaveBeenCalledWith('The game is full.');
  });
});
