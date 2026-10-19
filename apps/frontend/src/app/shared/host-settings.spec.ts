import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { SocketService } from '../core/socket.service';
import { expectNoA11yViolations, gameView, inBothModes, stubSocket } from '../core/testing';
import { HostSettings } from './host-settings';

async function setup(playerId = 'p0', over = {}) {
  const socket = stubSocket(
    gameView({ you: { playerId, seat: 0, timeoutWarning: false }, ...over }),
  );
  TestBed.configureTestingModule({
    imports: [HostSettings],
    providers: [providePrimeNG(), { provide: SocketService, useValue: socket }],
  });
  const fixture = TestBed.createComponent(HostSettings);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const slider = () => el.querySelector('p-slider') as HTMLElement;
  const handle = () => el.querySelector('input[type=range]') as HTMLInputElement;
  /** A native range input reports keyboard and pointer changes as input events. */
  const set = (value: number) => {
    handle().value = String(value);
    handle().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };
  return { socket, fixture, el, slider, handle, set };
}

describe('HostSettings', () => {
  afterEach(() => vi.useRealTimers());

  it('renders the value of the view with its name', async () => {
    const { el, handle } = await setup('p0', { computerSpeed: 4 });
    expect(el.textContent).toContain('4 · Fast');
    expect(handle().getAttribute('aria-valuenow')).toBe('4');
  });

  it('gives the slider an accessible name', async () => {
    const { handle } = await setup();
    expect(handle().getAttribute('aria-labelledby')).toBe('host-speed-label');
  });

  it('enables the controls for the host', async () => {
    const { el, slider } = await setup();
    expect(slider().classList.contains('p-disabled')).toBe(false);
    expect((el.querySelector('#fast-computer-dice') as HTMLInputElement).disabled).toBe(false);
  });

  it('disables the controls for a guest and says why', async () => {
    const { el, slider } = await setup('p9');
    expect(slider().classList.contains('p-disabled')).toBe(true);
    expect((el.querySelector('#fast-computer-dice') as HTMLInputElement).disabled).toBe(true);
    expect((el.querySelector('#show-bust-probability') as HTMLInputElement).disabled).toBe(true);
    expect(el.textContent).toContain('Only the host can change this.');
  });

  it('sends one computerSpeed with the final value after 300 ms of quiet', async () => {
    const { socket, set, el } = await setup();
    vi.useFakeTimers();
    set(4);
    set(5);
    expect(el.textContent).toContain('5 · Very fast');
    vi.advanceTimersByTime(299);
    expect(socket.settings).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(socket.settings).toHaveBeenCalledTimes(1);
    expect(socket.settings).toHaveBeenCalledWith({ computerSpeed: 5 });
  });

  it('sends the fast dice switch', async () => {
    const { socket, el } = await setup();
    (el.querySelector('#fast-computer-dice') as HTMLInputElement).click();
    expect(socket.settings).toHaveBeenCalledWith({ fastComputerDice: true });
  });

  it('sends the bust probability switch and follows the shared server setting', async () => {
    const { socket, el, fixture } = await setup();
    const toggle = el.querySelector<HTMLInputElement>('#show-bust-probability')!;
    expect(toggle.checked).toBe(false);
    toggle.click();
    expect(socket.settings).toHaveBeenCalledWith({ showBustProbability: true });
    socket.game.set({ ...socket.game()!, showBustProbability: true });
    fixture.detectChanges();
    expect(toggle.checked).toBe(true);
  });

  it('follows a changed server value', async () => {
    const { socket, fixture, el } = await setup();
    socket.game.set({ ...socket.game()!, computerSpeed: 1 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.textContent).toContain('1 · Very slow');
  });

  it('has no a11y violations in both modes', async () => {
    const { fixture } = await setup();
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });
});

describe('HostSettings computer names', () => {
  const computers = [
    { state: 'computer', name: 'Brave Fox', difficulty: 'easy', risk: 'medium' },
    { state: 'computer', name: 'Mutiges Kaninchen', difficulty: 'hard', risk: 'none' },
  ] as const;

  async function setupNames(playerId = 'p0') {
    const socket = stubSocket(
      gameView({ you: { playerId, seat: 0, timeoutWarning: false } }, [
        { state: 'human', playerId: 'p0', nickname: 'Ann', connected: true },
        ...computers,
      ]),
    );
    TestBed.configureTestingModule({
      imports: [HostSettings],
      providers: [providePrimeNG(), { provide: SocketService, useValue: socket }],
    });
    const fixture = TestBed.createComponent(HostSettings);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = (n: number) => el.querySelectorAll<HTMLInputElement>('.vl-rename input')[n];
    const type = async (n: number, value: string) => {
      input(n).value = value;
      input(n).dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const submit = async (n: number) => {
      el.querySelectorAll<HTMLFormElement>('.vl-rename')[n].dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { socket, fixture, el, input, type, submit };
  }

  it('offers one labelled rename field per computer to the host', async () => {
    const { el, input } = await setupNames();
    expect(el.querySelectorAll('.vl-rename')).toHaveLength(2);
    expect(input(0).value).toBe('Brave Fox');
    expect(input(1).value).toBe('Mutiges Kaninchen');
    expect(el.querySelector(`label[for="${input(0).id}"]`)?.textContent).toContain(
      'Rename Brave Fox',
    );
  });

  it('shows no rename control to guests', async () => {
    const { el } = await setupNames('p9');
    expect(el.querySelector('.vl-rename')).toBeNull();
  });

  it('keeps the save button disabled until the name really changes', async () => {
    const { el, type } = await setupNames();
    const save = () => el.querySelector<HTMLButtonElement>('.vl-rename button')!;
    expect(save().disabled).toBe(true);
    await type(0, '   ');
    expect(save().disabled).toBe(true);
    await type(0, 'Rex');
    expect(save().disabled).toBe(false);
  });

  it('sends the trimmed name for that seat', async () => {
    const { socket, type, submit } = await setupNames();
    socket.send.mockResolvedValue({ ok: true });
    await type(1, '  Rex ');
    await submit(1);
    expect(socket.send).toHaveBeenCalledWith('seat:rename', { seat: 2, name: 'Rex' });
  });

  it.each([
    ['invalidNickname', '2-20 characters'],
    ['nicknameTaken', 'already used'],
    ['notHost', 'Only the host'],
  ])('explains a %s rejection and keeps the draft', async (reason, text) => {
    const { socket, el, input, type, submit } = await setupNames();
    socket.send.mockResolvedValue({ ok: false, reason });
    await type(0, 'Rex');
    await submit(0);
    const error = el.querySelector('.vl-rename-error');
    expect(error?.textContent).toContain(text);
    expect(error?.getAttribute('role')).toBe('alert');
    expect(input(0).getAttribute('aria-describedby')).toBe(error?.id);
    expect(input(0).value).toBe('Rex');
  });

  it('follows a name changed by the server and clears the error', async () => {
    const { socket, fixture, input, type, submit } = await setupNames();
    socket.send.mockResolvedValue({ ok: false, reason: 'nicknameTaken' });
    await type(0, 'Rex');
    await submit(0);
    socket.game.set({
      ...socket.game()!,
      seats: socket.game()!.seats.map((s, i) => (i === 1 ? { ...s, name: 'Rex' } : s)),
    });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input(0).value).toBe('Rex');
    expect(fixture.nativeElement.querySelector('.vl-rename-error')).toBeNull();
  });

  it('has no a11y violations in both modes', async () => {
    const { fixture } = await setupNames();
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });
});
