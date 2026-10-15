import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { signal } from '@angular/core';
import { App } from './app';
import { expectNoA11yViolations, inBothModes } from './core/testing';
import { SOCKET, SocketService } from './core/socket.service';
import { I18nService } from './core/i18n.service';
import { ThemeService } from './core/theme.service';

function setup(connection = 'connected') {
  const theme = { mode: signal('system'), next: vi.fn() };
  const socket = { connection: signal(connection), session: signal(null), game: signal(null) };
  TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([]),
      providePrimeNG(),
      MessageService,
      { provide: SOCKET, useValue: {} },
      { provide: SocketService, useValue: socket },
      { provide: ThemeService, useValue: theme },
    ],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  return { fixture, theme, socket, el: fixture.nativeElement as HTMLElement };
}

describe('App', () => {
  it('renders the header and the main landmark', () => {
    const { el } = setup();
    expect(el.querySelector('h1')?.textContent).toContain('Volle Lotte');
    expect(el.querySelector('main')).not.toBeNull();
  });

  it('theme button cycles the mode and names the current one', async () => {
    const { fixture, theme, el } = setup();
    const button = el.querySelector<HTMLButtonElement>('p-button button')!;
    expect(button.getAttribute('aria-label')).toBe('Colour theme: System');
    button.click();
    expect(theme.next).toHaveBeenCalled();
    theme.mode.set('light');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(button.getAttribute('aria-label')).toBe('Colour theme: Light');
  });

  it('shows the offline notice only while not connected', () => {
    const { fixture, socket, el } = setup('connecting');
    expect(el.querySelector('p-message')?.textContent).toContain('connecting');
    socket.connection.set('connected');
    fixture.detectChanges();
    expect(el.querySelector('p-message')).toBeNull();
  });

  it('switches the visible text without reload and names the language select', async () => {
    const { fixture, el } = setup();
    const select = el.querySelector('p-select.vl-lang');
    expect(select?.querySelector('[aria-label="Language"]')).not.toBeNull();
    TestBed.inject(I18nService).set('de');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector<HTMLElement>('p-button button')?.getAttribute('aria-label')).toBe(
      'Farbschema: System',
    );
    expect(el.querySelector('p-select.vl-lang [aria-label="Sprache"]')).not.toBeNull();
    localStorage.clear();
  });

  it('has no axe violations in light and dark', async () => {
    const { fixture } = setup('disconnected');
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });
});
