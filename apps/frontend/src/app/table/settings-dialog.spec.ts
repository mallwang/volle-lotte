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
    expect(socket.settings).toHaveBeenCalledWith(true);
  });

  it('shows guests the setting read-only', async () => {
    const { input } = await setup('p9');
    expect(input.disabled).toBe(true);
    expect(document.body.textContent).toContain('host');
  });
});
