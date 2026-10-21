import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { defaultRules, encodeView } from 'game-rules';
import { fakeSocket, gameView } from '../core/testing';
import { CreateGame } from './create-game';

function setup(acks = {}) {
  const { emit } = fakeSocket(acks);
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CreateGame);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const type = (id: string, value: string) => {
    const input = el.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    el.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { emit, nav, el, type, submit };
}
const created = (emit: ReturnType<typeof setup>['emit']) =>
  emit.mock.calls.find((c) => c[0] === 'game:create');

describe('CreateGame', () => {
  it('validates name, password and rules before sending', async () => {
    const { emit, el, type, submit } = setup();
    type('game-name', '');
    type('game-password', 'abc');
    type('target', '0');
    await submit();
    expect(el.querySelectorAll('[role=alert]')).toHaveLength(3);
    expect(created(emit)).toBeUndefined();
  });

  it('creates an open game with the default rules and opens its lobby', async () => {
    const { emit, nav, type, submit } = setup({
      'game:create': { ok: true, game: encodeView(gameView({ id: 'g1' })) },
    });
    type('game-name', 'Table');
    await submit();
    expect(created(emit)?.[1]).toEqual({
      name: 'Table',
      password: '',
      seats: 4,
      rules: defaultRules(),
    });
    expect(nav).toHaveBeenCalledWith(['/game', 'g1']);
  });

  it('shows the server error', async () => {
    const { el, submit } = setup({ 'game:create': { ok: false, reason: 'alreadyInGame' } });
    await submit();
    expect(el.textContent).toContain('already in a game');
  });
});
