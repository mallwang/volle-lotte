import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SOCKET } from './core/socket.service';

describe('App', () => {
  it('should render the title and show the connection state', async () => {
    const socket = { connected: false, on: () => 0, emit: () => 0, connect: () => 0 };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: SOCKET, useValue: socket }],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Volle Lotte');
    expect(el.querySelector('output')?.textContent).toContain('connecting');
  });
});
