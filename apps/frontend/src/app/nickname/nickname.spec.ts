import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SocketService } from '../core/socket.service';
import { stubSocket } from '../core/testing';
import { Nickname } from './nickname';

async function setup() {
  const socket = stubSocket();
  TestBed.configureTestingModule({
    imports: [Nickname],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: SocketService, useValue: socket },
    ],
  });
  const fixture = TestBed.createComponent(Nickname);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const submit = async (value: string) => {
    const input = el.querySelector('input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { socket, el, submit };
}

describe('Nickname', () => {
  it('rejects an invalid nickname locally', async () => {
    const { socket, el, submit } = await setup();
    await submit('a');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('2-20');
    expect(socket.start).not.toHaveBeenCalled();
  });

  it('renders the server error reason', async () => {
    const { socket, el, submit } = await setup();
    socket.start.mockResolvedValue({ ok: false, reason: 'nicknameTaken' });
    await submit('Ann');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('already used');
  });
});
