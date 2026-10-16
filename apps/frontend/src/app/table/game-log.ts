import { Component, input } from '@angular/core';
import type { LogEntry } from 'game-rules';
import { TranslatePipe } from '../core/translate.pipe';
import { DieFace } from '../shared/die-face';

export interface LogPart {
  text: string;
  die: boolean;
}

/** Log panel, newest entry first; scrolls inside its own box. */
@Component({
  selector: 'app-game-log',
  imports: [DieFace, TranslatePipe],
  template: `
    <h3>{{ 'table.log' | t }}</h3>
    <ol class="vl-log" role="log" aria-live="polite">
      @for (e of entries(); track e) {
        <li>
          @for (part of parts()(e); track $index) {
            @if (part.die) {
              <span class="vl-log-die"
                ><app-die-face [value]="+part.text" /><span class="vl-sr-only">{{
                  part.text
                }}</span></span
              >
            } @else {
              {{ part.text }}
            }
          }
        </li>
      }
    </ol>
  `,
})
export class GameLog {
  readonly entries = input.required<readonly LogEntry[]>();
  readonly parts = input.required<(e: LogEntry) => LogPart[]>();
}
