import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { defaultSetup, type Preset } from 'client-core';
import { SetupStore } from '../core/setup-store';
import { PresetListDialog } from './preset-list-dialog';

const full = {
  ...defaultSetup(),
  seats: 8,
  computers: [{ seat: 2, difficulty: 'hard', risk: 'high' }],
  speed: 4,
} as const;

async function open(mode: 'create' | 'lobby' = 'create', names = ['Friday', 'Family']) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [PresetListDialog], providers: [providePrimeNG()] });
  const store = TestBed.inject(SetupStore);
  names.forEach((n) => store.savePreset(n, full as never));
  const fixture = TestBed.createComponent(PresetListDialog);
  fixture.componentRef.setInput('mode', mode);
  fixture.componentRef.setInput('visible', true);
  const chosen: Preset[] = [];
  fixture.componentInstance.chosen.subscribe((p) => chosen.push(p));
  await fixture.whenStable();
  const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('.vl-preset button')];
  const click = async (b: HTMLElement | undefined) => {
    b!.click();
    await fixture.whenStable();
  };
  const text = () => document.body.textContent ?? '';
  return { store, fixture, chosen, buttons, click, text };
}

describe('PresetListDialog', () => {
  beforeEach(() => localStorage.clear());

  it('lists the presets with a summary and the count', async () => {
    const { text } = await open();
    expect(text()).toContain('Friday');
    expect(text()).toContain('8 seats · target 6000 · computers: 1 · speed 4');
    expect(text()).toContain('2 of 10 presets');
  });

  it('shows an empty state', async () => {
    const { text } = await open('create', []);
    expect(text()).toContain('No presets yet');
  });

  it('loads a preset and closes', async () => {
    const { buttons, click, chosen, fixture } = await open();
    await click(buttons().find((b) => b.textContent?.includes('Load')));
    expect(chosen.map((p) => p.name)).toEqual(['Friday']);
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('applies in lobby mode and describes only computers and speed', async () => {
    const { buttons, click, chosen, text } = await open('lobby');
    expect(text()).toContain('Computers: 1 · speed 4');
    expect(text()).not.toContain('8 seats');
    await click(buttons().find((b) => b.textContent?.includes('Apply')));
    expect(chosen).toHaveLength(1);
  });

  it('asks before deleting, Keep cancels', async () => {
    const { buttons, click, store, text } = await open();
    await click(document.querySelector<HTMLButtonElement>('[aria-label="Delete preset Friday"]')!);
    expect(text()).toContain('Delete this preset?');
    await click(buttons().find((b) => b.textContent?.includes('Keep')));
    expect(store.presets()).toHaveLength(2);
    expect(text()).not.toContain('Delete this preset?');
  });

  it('deletes only the chosen preset after confirmation', async () => {
    const { buttons, click, store } = await open();
    await click(document.querySelector<HTMLButtonElement>('[aria-label="Delete preset Friday"]')!);
    await click(buttons().find((b) => b.textContent?.trim() === 'Delete'));
    expect(store.presets().map((p) => p.name)).toEqual(['Family']);
  });

  it('closes with the Close button', async () => {
    const { fixture, click } = await open();
    await click(
      [...document.querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.textContent?.trim() === 'Close',
      ),
    );
    expect(fixture.componentInstance.visible()).toBe(false);
  });
});
