import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { defaultRules } from 'game-rules';
import { SetupStore } from '../core/setup-store';
import { defaultSetup } from 'client-core';
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

const remembered = {
  ...defaultSetup(),
  seats: 6,
  rules: { ...defaultRules(), targetScore: 4000 },
  computers: [
    { seat: 2, difficulty: 'hard', risk: 'high' },
    { seat: 4, difficulty: 'easy', risk: 'none' },
  ],
  speed: 4,
} as const;

describe('CreateGame', () => {
  beforeEach(() => localStorage.clear());

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

  it('allows an empty password (open game)', async () => {
    const { socket, submit, type } = await setup();
    socket.create.mockResolvedValue({ ok: true, game: { id: 'g1' } });
    type('gameName', 'Table');
    await submit();
    expect(socket.create).toHaveBeenCalledWith(expect.objectContaining({ password: '' }));
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
    type('gamePassword', 'abc');
    type('target', '0');
    await submit();
    expect(el.querySelectorAll('p-message[role=alert]')).toHaveLength(3);
  });

  describe('remembered setup', () => {
    const remember = () =>
      localStorage.setItem('vl-last-setup', JSON.stringify({ v: 1, setup: remembered }));

    it('shows the defaults and no info line on a fresh device', async () => {
      const { el } = await setup();
      expect(el.querySelector<HTMLInputElement>('input[name=target]')?.value).toBe('6000');
      expect(el.querySelector('p-message[role=status]')).toBeNull();
    });

    it('prefills seats and rules from the last setup', async () => {
      remember();
      const { el } = await setup();
      expect(el.querySelector<HTMLInputElement>('input[name=target]')?.value).toBe('4000');
      expect(
        el.querySelector('.p-togglebutton-checked, [aria-pressed=true]')?.textContent,
      ).toContain('6');
      expect(el.querySelector('p-message[role=status]')?.textContent).toContain('(2)');
      expect(el.querySelector('p-message[role=status]')?.textContent).toContain('speed 4');
    });

    it('applies the remembered computers and speed after the game was created', async () => {
      remember();
      const { socket, submit, type } = await setup();
      socket.create.mockResolvedValue({
        ok: true,
        game: {
          id: 'g1',
          seats: [{ state: 'human' }, ...Array(5).fill({ state: 'open' })],
          computerSpeed: 3,
          fastComputerDice: false,
          showBustProbability: false,
        },
      });
      socket.send.mockResolvedValue({ ok: true });
      type('gameName', 'Table');
      await submit();
      expect(socket.create).toHaveBeenCalledWith(
        expect.objectContaining({ seats: 6, rules: remembered.rules }),
      );
      expect(socket.send.mock.calls).toEqual([
        ['seat:set', { seat: 2, mode: 'computer', difficulty: 'hard', risk: 'high' }],
        ['seat:set', { seat: 4, mode: 'computer', difficulty: 'easy', risk: 'none' }],
        ['game:settings', { computerSpeed: 4 }],
      ]);
    });

    it('still opens the lobby when applying the computers fails', async () => {
      remember();
      const { socket, submit, type } = await setup();
      socket.create.mockResolvedValue({
        ok: true,
        game: {
          id: 'g1',
          seats: [{ state: 'human' }, ...Array(5).fill({ state: 'open' })],
          computerSpeed: 3,
        },
      });
      socket.send.mockResolvedValue({ ok: false, reason: 'rejected' });
      type('gameName', 'Table');
      await submit();
      expect(socket.send).toHaveBeenCalledTimes(1);
    });

    it('sends no computer intents without remembered computers', async () => {
      const { socket, submit, type } = await setup();
      socket.create.mockResolvedValue({ ok: true, game: { id: 'g1' } });
      type('gameName', 'Table');
      await submit();
      expect(socket.send).not.toHaveBeenCalled();
    });

    it('never stores the game name or the password', async () => {
      const { socket, fixture, submit, type } = await setup();
      socket.create.mockResolvedValue({ ok: true, game: { id: 'g1' } });
      type('gameName', 'Secret table');
      type('gamePassword', 'hunter22');
      await submit();
      TestBed.inject(SetupStore).saveLast(remembered as never);
      fixture.destroy();
      const all = JSON.stringify({ ...localStorage });
      expect(all).not.toContain('Secret table');
      expect(all).not.toContain('hunter22');
    });
  });

  describe('presets', () => {
    const preset = {
      ...remembered,
      seats: 8,
      rules: { ...defaultRules(), targetScore: 3000, minimumPoints: 500 },
      computers: [{ seat: 3, difficulty: 'easy', risk: 'none' }],
      speed: 2,
    };
    const click = async (
      fixture: { whenStable(): Promise<unknown> },
      el: ParentNode,
      text: string,
    ) => {
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!.click();
      await fixture.whenStable();
    };

    it('loads all values of a preset at once and remembers it as the reference', async () => {
      const { fixture, el, socket, submit, type } = await setup();
      const store = TestBed.inject(SetupStore);
      store.savePreset('Friday', preset as never);
      await click(fixture, el, 'Load preset');
      await click(fixture, document.body, 'Load');
      fixture.detectChanges();
      expect(el.querySelector<HTMLInputElement>('input[name=target]')?.value).toBe('3000');
      expect(el.querySelector<HTMLInputElement>('input[name=minimum]')?.value).toBe('500');
      expect(el.querySelector('p-message[role=status]')?.textContent).toContain('speed 2');
      expect(store.reference()).toEqual(preset);
      socket.create.mockResolvedValue({
        ok: true,
        game: {
          id: 'g1',
          seats: [{ state: 'human' }, ...Array(7).fill({ state: 'open' })],
          computerSpeed: 3,
        },
      });
      socket.send.mockResolvedValue({ ok: true });
      type('gameName', 'Table');
      await submit();
      expect(socket.create).toHaveBeenCalledWith(expect.objectContaining({ seats: 8 }));
      expect(socket.send).toHaveBeenCalledWith('seat:set', {
        seat: 3,
        mode: 'computer',
        difficulty: 'easy',
        risk: 'none',
      });
    });

    it('saves a snapshot that later edits do not change', async () => {
      const { fixture, el, type } = await setup();
      const store = TestBed.inject(SetupStore);
      type('target', '3000');
      await click(fixture, el, 'Save as preset');
      const input = document.querySelector<HTMLInputElement>('#preset-name')!;
      input.value = 'Friday';
      input.dispatchEvent(new Event('input'));
      document.querySelectorAll('form')[1].dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      expect(store.presets()[0].setup.rules.targetScore).toBe(3000);
      type('target', '5000');
      await fixture.whenStable();
      expect(store.presets()[0].setup.rules.targetScore).toBe(3000);
    });

    it('stores the pending computers and speed in a saved preset', async () => {
      localStorage.setItem('vl-last-setup', JSON.stringify({ v: 1, setup: remembered }));
      const { fixture, el } = await setup();
      const store = TestBed.inject(SetupStore);
      await click(fixture, el, 'Save as preset');
      const input = document.querySelector<HTMLInputElement>('#preset-name')!;
      input.value = 'Friday';
      input.dispatchEvent(new Event('input'));
      document.querySelectorAll('form')[1].dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      expect(store.presets()[0].setup.computers).toHaveLength(2);
      expect(store.presets()[0].setup.speed).toBe(4);
    });

    it('disables the preset buttons and keeps the form usable when storage is blocked', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      const { el, socket, submit, type } = await setup();
      vi.restoreAllMocks();
      const buttons = [...el.querySelectorAll('button')];
      expect(buttons.find((b) => b.textContent?.includes('Load preset'))?.disabled).toBe(true);
      expect(el.textContent).toContain('cannot be saved on this device');
      socket.create.mockResolvedValue({ ok: true, game: { id: 'g1' } });
      type('gameName', 'Table');
      await submit();
      expect(socket.create).toHaveBeenCalled();
    });
  });

  describe('reset to defaults', () => {
    it('restores seats, rules and the pending computers, keeps presets, name and password', async () => {
      localStorage.setItem('vl-last-setup', JSON.stringify({ v: 1, setup: remembered }));
      const { fixture, el, socket, submit, type } = await setup();
      const store = TestBed.inject(SetupStore);
      store.savePreset('Friday', remembered as never);
      type('gameName', 'Table');
      type('gamePassword', 'secret');
      [...el.querySelectorAll('button')]
        .find((b) => b.textContent?.includes('Reset to defaults'))!
        .click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(el.querySelector<HTMLInputElement>('input[name=target]')?.value).toBe('6000');
      expect(el.querySelector<HTMLInputElement>('input[name=gameName]')?.value).toBe('Table');
      expect(el.querySelector('p-message[role=status]')).toBeNull();
      expect(localStorage.getItem('vl-last-setup')).toBeNull();
      expect(store.presets()).toHaveLength(1);
      socket.create.mockResolvedValue({ ok: true, game: { id: 'g1' } });
      await submit();
      expect(socket.create).toHaveBeenCalledWith({
        name: 'Table',
        password: 'secret',
        seats: 4,
        rules: defaultRules(),
      });
      expect(socket.send).not.toHaveBeenCalled();
    });
  });

  it('has no axe violations in light and dark', async () => {
    const { fixture, submit, type } = await setup();
    type('gameName', '');
    await submit();
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });
});
