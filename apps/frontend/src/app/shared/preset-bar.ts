import { Component, inject, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SetupStore } from '../core/setup-store';
import type { Preset, Setup } from '../core/setup';
import { TranslatePipe } from '../core/translate.pipe';
import { PresetListDialog } from './preset-list-dialog';
import { PresetSaveDialog } from './preset-save-dialog';

/**
 * "Load preset" and "Save as preset" with their dialogs, shared by the create-game page and the lobby.
 * Extra actions (for example "Reset to defaults") go in as content.
 */
@Component({
  selector: 'app-preset-bar',
  imports: [ButtonModule, PresetListDialog, PresetSaveDialog, TranslatePipe],
  template: `
    <div class="vl-presets" role="group" [attr.aria-label]="'preset.group' | t">
      <div class="vl-presets-text">
        @if (store.available()) {
          <strong>{{ title() }}</strong>
          <span class="vl-hint">{{ hint() }}</span>
        } @else {
          <strong>{{ 'preset.storageBlocked' | t }}</strong>
          <span class="vl-hint">{{ 'preset.storageBlockedHint' | t }}</span>
        }
      </div>
      <p-button
        type="button"
        severity="secondary"
        [outlined]="true"
        [label]="'preset.load' | t"
        [disabled]="!store.available()"
        (onClick)="listOpen.set(true)"
      />
      <p-button
        type="button"
        severity="secondary"
        [outlined]="true"
        [label]="'preset.save' | t"
        [disabled]="!store.available()"
        (onClick)="saveOpen.set(true)"
      />
      <ng-content />
    </div>
    <app-preset-list-dialog [(visible)]="listOpen" [mode]="mode()" (chosen)="loaded.emit($event)" />
    <app-preset-save-dialog
      [(visible)]="saveOpen"
      [setup]="current()()"
      (saved)="onSaved($event)"
    />
  `,
})
export class PresetBar {
  protected readonly store = inject(SetupStore);
  readonly mode = input<'create' | 'lobby'>('create');
  /** Returns the setup that "Save as preset" stores. */
  readonly current = input.required<() => Setup>();
  readonly title = input('');
  readonly hint = input('');
  readonly loaded = output<Preset>();
  protected readonly listOpen = signal(false);
  protected readonly saveOpen = signal(false);

  protected onSaved(preset: Preset): void {
    // the saved setup counts as known, so starting it unchanged does not ask again
    this.store.setReference(preset.setup);
  }
}
