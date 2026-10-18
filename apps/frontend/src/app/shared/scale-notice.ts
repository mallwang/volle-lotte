import { Component, inject } from '@angular/core';
import { TranslatePipe } from '../core/translate.pipe';
import { TableScale } from '../core/table-scale';

/** Dismissible hint that the table is scaled down; sits unscaled in the header band. */
@Component({
  selector: 'app-scale-notice',
  imports: [TranslatePipe],
  template: `
    <div class="vl-scale-notice" role="status">
      <span>{{ 'scale.notice' | t: { percent: percent() } }}</span>
      <button type="button" class="vl-scale-dismiss" (click)="scale.dismiss()">
        {{ 'scale.dismiss' | t }}
      </button>
    </div>
  `,
})
export class ScaleNotice {
  protected readonly scale = inject(TableScale);
  protected percent(): number {
    return Math.round(this.scale.scale() * 100);
  }
}
