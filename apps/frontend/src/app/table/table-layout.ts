import { Component, input } from '@angular/core';

/** Oval table: project seats as `<li seat class="vl-area-l1">` (clockwise DOM order) and the centre content. */
@Component({
  selector: 'app-table-layout',
  template: `
    <div class="vl-board">
      <div class="vl-felt" aria-hidden="true"></div>
      <ul class="vl-seats" [attr.aria-label]="label()">
        <ng-content select="[seat]" />
      </ul>
      <div class="vl-centre"><ng-content /></div>
    </div>
  `,
})
export class TableLayout {
  /** Accessible name of the seat list. */
  readonly label = input.required<string>();
}
