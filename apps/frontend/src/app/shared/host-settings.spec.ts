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
