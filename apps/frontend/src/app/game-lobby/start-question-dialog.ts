import { Component, inject, input, model, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { I18nService } from '../core/i18n.service';
import { describeSetup, type Setup } from '../core/setup';
import { TranslatePipe } from '../core/translate.pipe';

/** Asked on "Start game" when the setup is not known to be saved; closing it leaves the host in the lobby. */
@Component({
  selector: 'app-start-question-dialog',
  imports: [ButtonModule, DialogModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'startQuestion.title' | t"
      [style]="{ width: '30rem', maxWidth: '95vw' }"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
    >
      <p class="vl-start-question-text">{{ 'startQuestion.text' | t }}</p>
      <p class="vl-hint">{{ summary() }}</p>
      <div class="vl-actions vl-start-question-actions">
        <p-button
          type="button"
          [label]="'startQuestion.back' | t"
          severity="secondary"
          [link]="true"
          (onClick)="visible.set(false)"
        />
        <span class="vl-start-question-choices">
          <p-button
            type="button"
            [label]="'startQuestion.no' | t"
            severity="secondary"
            [outlined]="true"
            (onClick)="startAnyway.emit()"
          />
          <p-button type="button" [label]="'startQuestion.save' | t" (onClick)="saveFirst.emit()" />
        </span>
      </div>
    </p-dialog>
  `,
})
export class StartQuestionDialog {
  private readonly i18n = inject(I18nService);
  readonly visible = model(false);
  readonly setup = input.required<Setup>();
  readonly startAnyway = output();
  readonly saveFirst = output();

  protected summary(): string {
    return this.i18n.t('preset.summary', describeSetup(this.setup()));
  }
}
