import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { signal } from '@angular/core';
import { App } from './app';
import { expectNoA11yViolations, inBothModes } from './core/testing';
import { SOCKET, SocketService } from './core/socket.service';
import { I18nService } from './core/i18n.service';
import { ThemeService } from './core/theme.service';
import { TableScale } from './core/table-scale';

const openGame = (phase: string) => ({
  id: 'g1',
  phase,
  hostId: 'p0',
  you: { playerId: 'p0', seat: 0 },
});

/** The menubar listens to a media query for its collapsed layout; jsdom has no matchMedia. */
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

function setup(connection = 'connected') {
  const theme = { mode: signal('light'), toggle: vi.fn() };
  const socket = {
    connection: signal(connection),
    session: signal<unknown>({ playerId: 'p0', nickname: 'Ann' }),
    game: signal<unknown>(null),
  };
  TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([
        { path: 'lobby', children: [] },
        { path: 'create-game', children: [] },
        { path: '**', children: [] },
      ]),
      providePrimeNG(),
      MessageService,
      ConfirmationService,
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

  it('theme button toggles the mode, names it and shows the matching icon', async () => {
    const { fixture, theme, el } = setup();
    const button = el.querySelector<HTMLButtonElement>('p-button button')!;
    expect(button.getAttribute('aria-label')).toBe('Colour theme: Light. Switch to dark theme');
    expect(button.querySelector('.pi-sun')).not.toBeNull();
    button.click();
    expect(theme.toggle).toHaveBeenCalled();
    theme.mode.set('dark');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(button.getAttribute('aria-label')).toBe('Colour theme: Dark. Switch to light theme');
    expect(button.querySelector('.pi-moon')).not.toBeNull();
  });

  describe('menubar', () => {
    const links = (el: HTMLElement) => [
      ...el.querySelectorAll<HTMLAnchorElement>('a.vl-menu-link'),
    ];

    it('shows the page links and marks the open page', async () => {
      const { fixture, el } = setup();
      await TestBed.inject(Router).navigateByUrl('/create-game');
      fixture.detectChanges();
      await fixture.whenStable();
      const [games, create] = links(el);
      expect(games.textContent).toContain('Lobby');
      expect(create.textContent).toContain('Create game');
      expect(create.getAttribute('aria-current')).toBe('page');
      expect(games.getAttribute('aria-current')).toBeNull();
    });

    it('disables the page links without a session but keeps language and theme', () => {
      const { fixture, socket, theme, el } = setup();
      socket.session.set(null);
      fixture.detectChanges();
      expect(links(el)).toHaveLength(0);
      expect(el.querySelectorAll('.vl-menu-disabled[aria-disabled=true]')).toHaveLength(2);
      el.querySelector<HTMLButtonElement>('p-button button')!.click();
      expect(theme.toggle).toHaveBeenCalled();
      expect(el.querySelector('p-select.vl-lang')).not.toBeNull();
    });

    it('shows the current game with its phase while a game is open, links stay', () => {
      const { fixture, socket, el } = setup();
      socket.game.set(openGame('lobby'));
      fixture.detectChanges();
      const status = el.querySelector('.vl-menu-status')!;
      expect(status.textContent).toContain('Current game');
      expect(status.textContent).toContain('Lobby');
      expect(status.getAttribute('aria-current')).toBe('page');
      socket.game.set(openGame('running'));
      fixture.detectChanges();
      expect(el.querySelector('.vl-menu-status')!.textContent).toContain('Running');
      expect(links(el)).toHaveLength(2);
    });

    it('has no status entry without a game or for a finished game', () => {
      const { fixture, socket, el } = setup();
      expect(el.querySelector('.vl-menu-status')).toBeNull();
      socket.game.set(openGame('finished'));
      fixture.detectChanges();
      expect(el.querySelector('.vl-menu-status')).toBeNull();
    });
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
      'Farbschema: Hell. Zum dunklen Farbschema wechseln',
    );
    expect(el.querySelector('p-select.vl-lang [aria-label="Sprache"]')).not.toBeNull();
    localStorage.clear();
  });

  it('has no axe violations in light and dark', async () => {
    const { fixture } = setup('disconnected');
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });

  it('has no axe violations with a game status entry or without a session', async () => {
    const { fixture, socket } = setup();
    socket.game.set(openGame('running'));
    fixture.detectChanges();
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
    socket.session.set(null);
    socket.game.set(null);
    fixture.detectChanges();
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });
});

describe('App scaling', () => {
  function scaled(width: number, height: number) {
    Object.assign(window, { innerWidth: width, innerHeight: height });
    const ctx = setup();
    const scale = TestBed.inject(TableScale);
    scale.viewport.set({ width, height });
    scale.enable();
    ctx.fixture.detectChanges();
    return { ...ctx, scale };
  }

  it('scales the stage at 1280x650', () => {
    const { el } = scaled(1280, 650);
    const inner = el.querySelector<HTMLElement>('.vl-stage-inner')!;
    const outer = el.querySelector<HTMLElement>('.vl-stage')!;
    expect(inner.style.transform).toMatch(/^scale\(0\.72/);
    expect(parseFloat(outer.style.height)).toBeCloseTo(650, 0);
    expect(el.querySelector('app-scale-notice')).not.toBeNull();
  });

  it('applies no transform at 1920x950 or while disabled', () => {
    const { el } = scaled(1920, 950);
    expect(el.querySelector<HTMLElement>('.vl-stage-inner')!.style.transform).toBe('');
    expect(el.querySelector('app-scale-notice')).toBeNull();
  });

  it('applies no transform while the service is disabled', () => {
    const { el } = setup();
    expect(el.querySelector<HTMLElement>('.vl-stage-inner')!.style.transform).toBe('');
  });

  it('shows the hint below the minimum and keeps the stage in the DOM', () => {
    const { fixture, el, scale } = scaled(1280, 650);
    const stage = el.querySelector('.vl-stage')!;
    scale.viewport.set({ width: 600, height: 600 });
    fixture.detectChanges();
    expect(el.querySelector('app-window-too-small')).not.toBeNull();
    expect(el.querySelector('.vl-stage')).toBe(stage);
    expect((stage as HTMLElement).hidden).toBe(true);
    scale.viewport.set({ width: 1280, height: 650 });
    fixture.detectChanges();
    expect(el.querySelector('app-window-too-small')).toBeNull();
    expect((stage as HTMLElement).hidden).toBe(false);
  });

  it('hides the notice after dismissal', () => {
    const { fixture, el, scale } = scaled(1280, 650);
    scale.dismiss();
    fixture.detectChanges();
    expect(el.querySelector('app-scale-notice')).toBeNull();
  });
});
