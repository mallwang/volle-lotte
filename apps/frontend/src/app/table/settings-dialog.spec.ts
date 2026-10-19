import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { SocketService } from '../core/socket.service';
import { gameView, stubSocket } from '../core/testing';
import { SettingsDialog } from './settings-dialog';

async function setup(playerId: string) {
  const socket = stubSocket(gameView({ you: { playerId, seat: 0, timeoutWarning: false } }));
  TestBed.configureTestingModule({
    imports: [SettingsDialog],
    providers: [providePrimeNG(), { provide: SocketService, useValue: socket }],
  });
  const fixture = TestBed.createComponent(SettingsDialog);
  fixture.componentRef.setInput('visible', true);
  await fixture.whenStable();
  const input = document.querySelector('#fast-computer-dice') as HTMLInputElement;
  return { socket, input };
}

describe('SettingsDialog', () => {
  it('lets the host change fast computer dice', async () => {
    const { socket, input } = await setup('p0');
    expect(input.disabled).toBe(false);
    input.click();
    expect(socket.settings).toHaveBeenCalledWith({ fastComputerDice: true });
  });

  it('shows the computer speed slider in the dialog', async () => {
    await setup('p0');
    expect(document.body.textContent).toContain('Computer speed');
    expect(document.body.textContent).toContain('3 · Medium');
  });

  it('shows guests the setting read-only', async () => {
    const { input } = await setup('p9');
    expect(input.disabled).toBe(true);
    expect(document.body.textContent).toContain('host');
  });
});

describe('SettingsDialog for a spectator', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.querySelectorAll('.p-dialog-mask').forEach((m) => m.remove());
  });

  it('offers only the local skip-animation toggle', async () => {
    const socket = stubSocket(
      gameView({ you: { playerId: 'v1', seat: -1, timeoutWarning: false, spectator: true } }),
    );
    TestBed.configureTestingModule({
      imports: [SettingsDialog],
      providers: [providePrimeNG(), { provide: SocketService, useValue: socket }],
    });
    const fixture = TestBed.createComponent(SettingsDialog);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    expect(document.querySelector('#skip-dice')).not.toBeNull();
    expect(document.querySelector('#fast-computer-dice')).toBeNull();
    expect(document.querySelector('#allow-spectators')).toBeNull();
    expect(document.body.textContent).not.toContain('Computer speed');
  });

  it('shows the spectating switch to the host and read-only to a guest', async () => {
    const { input } = await setup('p0');
    expect((document.querySelector('#allow-spectators') as HTMLInputElement).disabled).toBe(false);
    expect(input).not.toBeNull();
  });
});
