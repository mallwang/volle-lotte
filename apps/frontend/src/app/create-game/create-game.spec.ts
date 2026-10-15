import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { defaultRules } from 'game-rules';
import { SocketService } from '../core/socket.service';
import { stubSocket } from '../core/testing';
import { CreateGame } from './create-game';

async function setup() {
  const socket = stubSocket();
  TestBed.configureTestingModule({
    imports: [CreateGame],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
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
  return { socket, el, type, submit };
}

describe('CreateGame', () => {
  it('validates name and password before sending', async () => {
    const { socket, el, submit, type } = await setup();
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Name');
    type('name', 'Table');
    type('password', 'abc');
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Password');
    expect(socket.create).not.toHaveBeenCalled();
  });

  it('sends the default rules', async () => {
    const { socket, submit, type } = await setup();
    socket.create.mockResolvedValue({ ok: true, game: { id: 'g1' } });
    type('name', 'Table');
    type('password', 'secret');
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
    type('name', 'Table');
    type('password', 'secret');
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('already in a game');
  });
});
