import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { seatAreas } from '../core/table-view';
import { TableLayout } from './table-layout';

@Component({
  imports: [TableLayout],
  template: `
    <app-table-layout label="Players">
      @for (a of areas; track a) {
        <li seat [class]="'vl-area-' + a">{{ a }}</li>
      }
      <p class="mid">centre</p>
    </app-table-layout>
  `,
})
class Host {
  areas = seatAreas(4);
}

describe('TableLayout', () => {
  it('projects seats into the labelled list and the rest into the centre', () => {
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const list = el.querySelector('ul.vl-seats')!;
    expect(list.getAttribute('aria-label')).toBe('Players');
    expect([...list.children].map((li) => li.className)).toEqual(
      seatAreas(4).map((a) => `vl-area-${a}`),
    );
    expect(el.querySelector('.vl-centre .mid')?.textContent).toBe('centre');
  });
});
