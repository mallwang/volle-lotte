import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { defaultRules } from 'game-rules';
import { SocketService } from '../core/socket.service';
import { expectNoA11yViolations, inBothModes, stubSocket } from '../core/testing';
import { CreateGame } from './create-game';

async function setup() {
  const socket = stubSocket();
  TestBed.configureTestingModule({
    imports: [CreateGame],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      providePrimeNG(),
      { provide: SocketService, useValue: socket },
    ],
  });
  const fixture = TestBed.createComponent(CreateGame);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const type = (name: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`input[name=${name}]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { socket, fixture, el, type, submit };
}

describe('CreateGame', () => {
  it('validates name and password before sending', async () => {
    const { socket, el, submit, type } = await setup();
    type('gameName', '');
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Name');
    type('gameName', 'Table');
    type('gamePassword', 'abc');
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Password');
    expect(socket.create).not.toHaveBeenCalled();
  });

  it('prefills the game name from the nickname', async () => {
    const { el } = await setup();
    expect(el.querySelector<HTMLInputElement>('input[name=gameName]')?.value).toBe("Ann's Game");
  });

  it('sends the default rules', async () => {
    const { socket, submit, type } = await setup();
    socket.create.mockResolvedValue({ ok: true, game: { id: 'g1' } });
    type('gameName', 'Table');
    type('gamePassword', 'secret');
    await submit();
    expect(socket.create).toHaveBeenCalledWith({
      name: 'Table',
      password: 'secret',
      seats: 4,
      rules: defaultRules(),
    });
  });

  it('renders a server error', async () => {
    const { socket, el, submit, type } = await setup();
    socket.create.mockResolvedValue({ ok: false, reason: 'alreadyInGame' });
    type('gameName', 'Table');
    type('gamePassword', 'secret');
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('already in a game');
  });

  it('shows per-field errors next to each invalid field', async () => {
    const { el, submit, type } = await setup();
    type('gameName', '');
    type('target', '0');
    await submit();
    expect(el.querySelectorAll('p-message[role=alert]')).toHaveLength(3);
  });

  it('has no axe violations in light and dark', async () => {
    const { fixture, submit } = await setup();
    await submit();
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });
});
