import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { MOBILE_SOCKET } from './core/mobile-connection.service';

function setup() {
  const handlers: Record<string, () => void> = {};
  TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      {
        provide: MOBILE_SOCKET,
        useValue: { connected: false, on: (e: string, h: () => void) => (handlers[e] = h) },
      },
    ],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  return { fixture, handlers, el: fixture.nativeElement as HTMLElement };
}

describe('App', () => {
  it('renders the shell with a main landmark and the connection state', async () => {
    const { fixture, handlers, el } = setup();
    expect(el.querySelector('h1')?.textContent).toContain('Volle Lotte');
    expect(el.querySelector('main')?.textContent).toContain('Connecting');
    handlers['connect']();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('main')?.textContent).toContain('Connected');
  });

  it('keeps the shell when a nested mobile route is loaded directly', async () => {
    const { fixture, el } = setup();
    await TestBed.inject(Router).navigateByUrl('/lobby/abc');
    fixture.detectChanges();
    expect(el.querySelector('h1')?.textContent).toContain('Volle Lotte');
  });
});
