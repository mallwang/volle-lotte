import { Injectable, signal } from '@angular/core';

const KEY = 'vl-skip-dice';

/** Device-local "skip dice animation" preference; never sent to the server. */
@Injectable({ providedIn: 'root' })
export class DicePrefs {
  readonly skip = signal(read());

  setSkip(value: boolean): void {
    this.skip.set(value);
    try {
      localStorage.setItem(KEY, String(value));
    } catch {
      // storage blocked: the preference only lasts for this page load
    }
  }
}

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}
