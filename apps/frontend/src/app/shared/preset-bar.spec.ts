import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { defaultSetup, type Preset, type Setup } from '../core/setup';
import { SetupStore } from '../core/setup-store';
import { PresetBar } from './preset-bar';

const room: Setup = {
  ...defaultSetup(),
  seats: 5,
  computers: [{ seat: 1, difficulty: 'easy', risk: 'none' }],
};

@Component({
  imports: [PresetBar],
  template: `<app-preset-bar
    [mode]="mode"
    [current]="current"
    [changed]="changed()"
    (resetRequested)="resets = resets + 1"
    title="Presets"
    hint="Hint text"
    (loaded)="loaded.push($event)"
  />`,
})
class Host {
  mode: 'create' | 'lobby' = 'create';
  current = () => room;
  loaded: Preset[] = [];
  changed = signal(false);
  resets = 0;
}

async function setup(mode: 'create' | 'lobby' = 'create') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [Host], providers: [providePrimeNG()] });
  const store = TestBed.inject(SetupStore);
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.mode = mode;
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(label));
  return { store, fixture, el, button };
}

describe('PresetBar', () => {
  beforeEach(() => localStorage.clear());

  it('offers "Reset to defaults" only while the setup differs from the defaults', async () => {
    const { fixture, button } = await setup();
    expect(button('Reset to defaults')).toBeUndefined();
    fixture.componentInstance.changed.set(true);
    await fixture.whenStable();
    button('Reset to defaults')!.click();
    expect(fixture.componentInstance.resets).toBe(1);
  });

  it('shows the title, the hint and both buttons', async () => {
    const { el, button } = await setup();
    expect(el.textContent).toContain('Presets');
    expect(el.textContent).toContain('Hint text');
    expect((button('Load preset') as HTMLButtonElement).disabled).toBe(false);
    expect((button('Save as preset') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shares one list between both modes and stores the complete setup', async () => {
    const lobby = await setup('lobby');
    lobby.button('Save as preset')!.click();
    await lobby.fixture.whenStable();
    const input = document.querySelector<HTMLInputElement>('#preset-name')!;
    input.value = 'Friday';
    input.dispatchEvent(new Event('input'));
    document.querySelector('form')!.dispatchEvent(new Event('submit'));
    await lobby.fixture.whenStable();
    expect(lobby.store.presets()).toEqual([{ name: 'Friday', setup: room }]);
    expect(lobby.store.reference()).toEqual(room);

    const create = await setup('create');
    create.button('Load preset')!.click();
    await create.fixture.whenStable();
    expect(document.body.textContent).toContain('Friday');
    expect(document.body.textContent).toContain('5 seats');
  });

  it('forwards the chosen preset', async () => {
    const { store, fixture, button } = await setup();
    store.savePreset('Friday', room);
    button('Load preset')!.click();
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLButtonElement>('.vl-preset button')]
      .find((b) => b.textContent?.includes('Load'))!
      .click();
    expect(fixture.componentInstance.loaded.map((p) => p.name)).toEqual(['Friday']);
  });

  it('disables both buttons and explains it when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { el, button } = await setup();
    vi.restoreAllMocks();
    expect((button('Load preset') as HTMLButtonElement).disabled).toBe(true);
    expect((button('Save as preset') as HTMLButtonElement).disabled).toBe(true);
    expect(el.textContent).toContain('cannot be saved on this device');
  });
});
