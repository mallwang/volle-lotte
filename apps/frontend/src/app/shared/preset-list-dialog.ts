import { Component, inject, input, model, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { I18nService } from '../core/i18n.service';
import { SetupStore } from '../core/setup-store';
import { describeSetup, MAX_PRESETS, type Preset } from 'client-core';
import { TranslatePipe } from '../core/translate.pipe';

/** Lists the presets of this device: load (create page) or apply (lobby), and delete with a confirmation. */
@Component({
  selector: 'app-preset-list-dialog',
  imports: [ButtonModule, DialogModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'preset.loadTitle' | t"
      [style]="{ width: '30rem', maxWidth: '95vw' }"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
    >
      <p class="vl-hint">
        {{ (mode() === 'create' ? 'preset.loadHintCreate' : 'preset.loadHintLobby') | t }}
      </p>
      @if (store.presets().length === 0) {
        <p>{{ 'preset.empty' | t }}</p>
      } @else {
        <ul class="vl-presets-list">
          @for (p of store.presets(); track p.name) {
            <li class="vl-preset" [class.vl-preset-confirm]="confirming() === p.name">
              <span class="vl-preset-text">
                <strong>{{ p.name }}</strong>
                @if (confirming() === p.name) {
                  <small>{{ 'preset.deleteConfirm' | t }}</small>
                } @else {
                  <small>{{ summary(p) }}</small>
                }
              </span>
              @if (confirming() === p.name) {
                <p-button
                  size="small"
                  severity="danger"
                  [label]="'preset.delete' | t"
                  (onClick)="remove(p)"
                />
                <p-button
                  size="small"
                  severity="secondary"
                  [label]="'preset.keep' | t"
                  (onClick)="confirming.set(null)"
                />
              } @else {
                <p-button
                  size="small"
                  [label]="(mode() === 'create' ? 'preset.loadButton' : 'preset.apply') | t"
                  (onClick)="choose(p)"
                />
                <p-button
                  size="small"
                  icon="pi pi-trash"
                  severity="secondary"
                  [text]="true"
                  [ariaLabel]="'preset.deleteLabel' | t: { name: p.name }"
                  (onClick)="confirming.set(p.name)"
                />
              }
            </li>
          }
        </ul>
      }
      <div class="vl-actions">
        <small class="vl-hint">{{
          'preset.count' | t: { count: store.presets().length, max: maxPresets }
        }}</small>
        <p-button
          [label]="'preset.close' | t"
          severity="secondary"
          (onClick)="visible.set(false)"
        />
      </div>
    </p-dialog>
  `,
})
export class PresetListDialog {
  protected readonly store = inject(SetupStore);
  readonly visible = model(false);
  readonly mode = input<'create' | 'lobby'>('create');
  readonly chosen = output<Preset>();
  protected readonly maxPresets = MAX_PRESETS;
  protected readonly confirming = signal<string | null>(null);
  private readonly i18n = inject(I18nService);

  protected summary(p: Preset): string {
    const d = describeSetup(p.setup);
    return this.i18n.t(this.mode() === 'create' ? 'preset.summary' : 'preset.summaryLobby', d);
  }

  protected choose(p: Preset): void {
    this.chosen.emit(p);
    this.visible.set(false);
  }

  protected remove(p: Preset): void {
    this.store.deletePreset(p.name);
    this.confirming.set(null);
  }
}
