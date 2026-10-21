import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { fakeSocket } from './core/testing';

function setup(connected = false) {
  const socket = fakeSocket({}, connected);
  TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter([{ path: '**', children: [] }])],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  return { fixture, ...socket, el: fixture.nativeElement as HTMLElement };
}

describe('App', () => {
  it('renders the shell and an offline banner until connected', async () => {
    const { fixture, fire, el } = setup();
    expect(el.querySelector('h1')?.textContent).toContain('Volle Lotte');
    expect(el.querySelector('main')).not.toBeNull();
    expect(el.querySelector('.offline')).not.toBeNull();
    fire('connect');
    fixture.detectChanges();
    expect(el.querySelector('.offline')).toBeNull();
  });

  it('shows a server notice and lets the user dismiss it', () => {
    const { fixture, fire, el } = setup(true);
    fire('session:replaced');
    fixture.detectChanges();
    expect(el.querySelector('.notice')?.textContent).toContain('another window');
    (el.querySelector('.notice button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.notice')).toBeNull();
  });

  it('keeps the shell when a nested mobile route is loaded directly', async () => {
    const { fixture, el } = setup(true);
    await TestBed.inject(Router).navigateByUrl('/lobby/abc');
    fixture.detectChanges();
    expect(el.querySelector('h1')?.textContent).toContain('Volle Lotte');
  });
});
