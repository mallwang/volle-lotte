import { Injectable, signal } from '@angular/core';
import { MAX_PRESETS, MAX_PRESET_NAME, sanitizeSetup, type Preset, type Setup } from './setup';

const LAST_KEY = 'vl-last-setup';
const PRESETS_KEY = 'vl-presets';
const PROBE_KEY = 'vl-probe';
const VERSION = 1;

export type SavePresetResult = 'ok' | 'exists' | 'full' | 'name' | 'storage';

/** Device-local "last setup" and named presets (`localStorage`); never talks to the server. */
@Injectable({ providedIn: 'root' })
export class SetupStore {
  /** Setup of the last started game. */
  readonly last = signal<Setup | null>(readLast());
  readonly presets = signal<Preset[]>(readPresets());
  /** False when this browser cannot store data; everything still works for this page load. */
  readonly available = signal(probe());
  /** The setup last loaded, saved or declined in this tab; decides when the start question is shown. */
  readonly reference = signal<Setup | null>(null);

  saveLast(setup: Setup): void {
    this.last.set(setup);
    if (!write(LAST_KEY, { v: VERSION, setup })) this.available.set(false);
  }

  resetLast(): void {
    this.last.set(null);
    try {
      localStorage.removeItem(LAST_KEY);
    } catch {
      this.available.set(false);
    }
  }

  hasPreset(name: string): boolean {
    const key = normalize(name);
    return this.presets().some((p) => normalize(p.name) === key);
  }

  /** Saves a snapshot under `name`; an existing name is only replaced with `replace`. */
  savePreset(name: string, setup: Setup, replace = false): SavePresetResult {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_PRESET_NAME) return 'name';
    if (!this.available()) return 'storage';
    const existing = this.hasPreset(trimmed);
    if (existing && !replace) return 'exists';
    if (!existing && this.presets().length >= MAX_PRESETS) return 'full';
    const key = normalize(trimmed);
    const items = existing
      ? this.presets().map((p) => (normalize(p.name) === key ? { name: trimmed, setup } : p))
      : [...this.presets(), { name: trimmed, setup }];
    return this.persist(items) ? 'ok' : 'storage';
  }

  deletePreset(name: string): void {
    const key = normalize(name);
    this.persist(this.presets().filter((p) => normalize(p.name) !== key));
  }

  setReference(setup: Setup | null): void {
    this.reference.set(setup);
  }

  private persist(items: Preset[]): boolean {
    this.presets.set(items);
    const ok = write(PRESETS_KEY, { v: VERSION, items });
    if (!ok) this.available.set(false);
    return ok;
  }
}

const normalize = (name: string) => name.trim().toLowerCase();

function readJson(key: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readLast(): Setup | null {
  const data = readJson(LAST_KEY);
  return data?.['v'] === VERSION && data['setup'] !== undefined
    ? sanitizeSetup(data['setup'])
    : null;
}

function readPresets(): Preset[] {
  const data = readJson(PRESETS_KEY);
  if (data?.['v'] !== VERSION || !Array.isArray(data['items'])) return [];
  const seen = new Set<string>();
  const items: Preset[] = [];
  for (const item of data['items'] as unknown[]) {
    const name = (item as { name?: unknown } | null)?.name;
    if (typeof name !== 'string') continue;
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_PRESET_NAME || seen.has(normalize(trimmed)))
      continue;
    seen.add(normalize(trimmed));
    items.push({ name: trimmed, setup: sanitizeSetup((item as { setup?: unknown }).setup) });
  }
  return items.slice(0, MAX_PRESETS);
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function probe(): boolean {
  try {
    localStorage.setItem(PROBE_KEY, '1');
    localStorage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}
