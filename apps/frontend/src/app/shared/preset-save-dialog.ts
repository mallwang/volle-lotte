import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SetupStore } from '../core/setup-store';
import { MAX_PRESET_NAME, MAX_PRESETS, type Preset, type Setup } from '../core/setup';
import { TranslatePipe } from '../core/translate.pipe';

/** Saves a snapshot of `setup` under a name; asks before replacing and explains the limit. */
@Component({
  selector: 'app-preset-save-dialog',
  imports: [ButtonModule, DialogModule, FormsModule, InputTextModule, MessageModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'preset.saveTitle' | t"
      [style]="{ width: '30rem', maxWidth: '95vw' }"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
    >
      <form class="vl-form" (ngSubmit)="save()">
        <p class="vl-hint">{{ 'preset.saveHint' | t }}</p>
        <div class="vl-field">
          <label for="preset-name">{{ 'preset.name' | t }}</label>
          <input
            pInputText
            id="preset-name"
            name="presetName"
            [ngModel]="name()"
            (ngModelChange)="changed($event)"
            [attr.maxlength]="maxName"
            autocomplete="off"
            data-bwignore
            data-lpignore="true"
            data-1p-ignore
          />
          <small class="vl-hint">{{
            'preset.nameCount' | t: { count: name().trim().length, max: maxName }
          }}</small>
        </div>
        @if (exists()) {
          <p-message severity="warn" size="small" role="alert">{{
            'preset.exists' | t: { name: name().trim() }
          }}</p-message>
        }
        @if (full()) {
          <p-message severity="warn" size="small" role="alert">{{
            'preset.full' | t: { max: maxPresets }
          }}</p-message>
        }
        @if (failed()) {
          <p-message severity="error" size="small" role="alert">{{
            'preset.storageBlocked' | t
          }}</p-message>
        }
        <div class="vl-actions">
          <p-button
            type="button"
            [label]="'preset.cancel' | t"
            severity="secondary"
            (onClick)="visible.set(false)"
          />
          <p-button
            type="submit"
            [label]="(exists() ? 'preset.replace' : 'preset.saveButton') | t"
            [disabled]="!valid()"
          />
        </div>
      </form>
    </p-dialog>
  `,
})
export class PresetSaveDialog {
  private readonly store = inject(SetupStore);
  readonly visible = model(false);
  readonly setup = input.required<Setup>();
  readonly saved = output<Preset>();
  protected readonly maxName = MAX_PRESET_NAME;
  protected readonly maxPresets = MAX_PRESETS;
  protected readonly name = signal('');
  protected readonly failed = signal(false);
  protected readonly exists = computed(() => this.store.hasPreset(this.name()));
  protected readonly full = computed(
    () => !this.exists() && this.store.presets().length >= MAX_PRESETS,
  );
  protected readonly valid = computed(() => {
    const length = this.name().trim().length;
    return length >= 1 && length <= MAX_PRESET_NAME && !this.full();
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.name.set('');
        this.failed.set(false);
      }
    });
  }

  protected changed(value: string): void {
    this.name.set(value);
    this.failed.set(false);
  }

  protected save(): void {
    if (!this.valid()) return;
    const setup = this.setup();
    const result = this.store.savePreset(this.name(), setup, this.exists());
    if (result === 'ok') {
      this.saved.emit({ name: this.name().trim(), setup });
      this.visible.set(false);
    } else if (result === 'storage') this.failed.set(true);
  }
}
