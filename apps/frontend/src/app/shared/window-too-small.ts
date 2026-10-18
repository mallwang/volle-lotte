import { Component, inject } from '@angular/core';
import { TranslatePipe } from '../core/translate.pipe';
import { MIN_HEIGHT, MIN_WIDTH, TableScale } from '../core/table-scale';

/** Blocking hint shown instead of the table below the minimum window size. */
@Component({
  selector: 'app-window-too-small',
  imports: [TranslatePipe],
  template: `
    <section class="vl-too-small" aria-live="polite">
      <h2>{{ 'scale.tooSmall.title' | t }}</h2>
      <p>
        {{
          'scale.tooSmall.body'
            | t
              : {
                  width: minWidth,
                  height: minHeight,
                  currentWidth: scale.viewport().width,
                  currentHeight: scale.viewport().height,
                }
        }}
      </p>
      <p>{{ 'scale.tooSmall.running' | t }}</p>
    </section>
  `,
})
export class WindowTooSmall {
  protected readonly scale = inject(TableScale);
  protected readonly minWidth = MIN_WIDTH;
  protected readonly minHeight = MIN_HEIGHT;
}
