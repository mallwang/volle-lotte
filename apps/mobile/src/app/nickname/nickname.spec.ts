import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fakeSocket } from '../core/testing';
import { Nickname } from './nickname';

function setup(acks = {}) {
  const { emit } = fakeSocket(acks);
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(Nickname);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const submit = async (value: string) => {
    (el.querySelector('input') as HTMLInputElement).value = value;
    el.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { emit, nav, el, submit };
}

describe('Nickname', () => {
  it('rejects an invalid nickname without asking the server', async () => {
    const { emit, el, submit } = setup();
    await submit('x');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('2-20');
    expect(emit).not.toHaveBeenCalled();
  });

  it('starts the session and opens the list', async () => {
    const { nav, submit } = setup({
      'session:start': {
        ok: true,
        token: 't',
        playerId: 'p',
        nickname: 'Anna',
        protocolVersion: 1,
      },
    });
    await submit(' Anna ');
    expect(nav).toHaveBeenCalledWith('/');
  });

  it('shows the server error', async () => {
    const { nav, el, submit } = setup({ 'session:start': { ok: false, reason: 'nicknameTaken' } });
    await submit('Anna');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('already used');
    expect(nav).not.toHaveBeenCalled();
  });
});
