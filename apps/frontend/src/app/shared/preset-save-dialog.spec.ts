import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { defaultSetup, MAX_PRESETS, type Preset } from '../core/setup';
import { SetupStore } from '../core/setup-store';
import { PresetSaveDialog } from './preset-save-dialog';

const setup = { ...defaultSetup(), seats: 6 };

async function open() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [PresetSaveDialog], providers: [providePrimeNG()] });
  const store = TestBed.inject(SetupStore);
  const fixture = TestBed.createComponent(PresetSaveDialog);
  fixture.componentRef.setInput('visible', true);
  fixture.componentRef.setInput('setup', setup);
  const saved: Preset[] = [];
  fixture.componentInstance.saved.subscribe((p) => saved.push(p));
  await fixture.whenStable();
  const input = () => document.querySelector<HTMLInputElement>('#preset-name')!;
  const submit = document.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const type = async (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submitForm = async () => {
    document.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  return { store, fixture, saved, input, submit: () => submit, type, submitForm };
}

describe('PresetSaveDialog', () => {
  beforeEach(() => localStorage.clear());

  it('saves a new name and emits the snapshot', async () => {
    const { store, saved, type, submitForm, fixture } = await open();
    await type('  Friday  ');
    await submitForm();
    expect(store.presets()).toEqual([{ name: 'Friday', setup }]);
    expect(saved).toEqual([{ name: 'Friday', setup }]);
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('shows the character counter', async () => {
    const { type } = await open();
    await type('Friday');
    expect(document.body.textContent).toContain('6 of 30 characters');
  });

  it('does not save a blank name', async () => {
    const { store, type, submitForm, submit } = await open();
    expect(submit().disabled).toBe(true);
    await type('   ');
    await submitForm();
    expect(store.presets()).toEqual([]);
  });

  it('asks before replacing and then replaces', async () => {
    const { store, type, submitForm, submit } = await open();
    store.savePreset('Friday', defaultSetup());
    await type('friday');
    expect(document.body.textContent).toContain('already exists');
    expect(submit().textContent).toContain('Replace preset');
    await submitForm();
    expect(store.presets()).toEqual([{ name: 'friday', setup }]);
  });

  it('explains the limit and disables Save, but still replaces', async () => {
    const { store, type, submit, submitForm, saved } = await open();
    for (let i = 0; i < MAX_PRESETS; i++) store.savePreset(`P${i}`, defaultSetup());
    await type('Extra');
    expect(document.body.textContent).toContain('All 10 presets are used');
    expect(submit().disabled).toBe(true);
    await submitForm();
    expect(saved).toEqual([]);
    await type('P2');
    expect(submit().disabled).toBe(false);
  });

  it('tells the host when the browser refuses to store', async () => {
    const { type, submitForm, saved } = await open();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await type('Friday');
    await submitForm();
    expect(saved).toEqual([]);
    expect(document.body.textContent).toContain('cannot be saved on this device');
    vi.restoreAllMocks();
  });

  it('starts with an empty name each time it opens', async () => {
    const { fixture, type } = await open();
    await type('Friday');
    fixture.componentInstance.visible.set(false);
    await fixture.whenStable();
    fixture.componentInstance.visible.set(true);
    await fixture.whenStable();
    expect(document.querySelector<HTMLInputElement>('#preset-name')!.value).toBe('');
  });
});
