import { TestBed } from '@angular/core/testing';
import { PIP_CELLS } from 'client-core';
import { DieFace } from './die-face';

describe('DieFace', () => {
  it('maps each value to that many distinct cells', () => {
    for (let v = 1; v <= 6; v++) {
      expect(PIP_CELLS[v]).toHaveLength(v);
      expect(new Set(PIP_CELLS[v]).size).toBe(v);
    }
  });

  it('renders pips, blank for null, and hides from assistive tech', () => {
    const f = TestBed.createComponent(DieFace);
    f.componentRef.setInput('value', 5);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelectorAll('.pip')).toHaveLength(5);
    expect(el.querySelector('.face')?.getAttribute('aria-hidden')).toBe('true');
    f.componentRef.setInput('value', null);
    f.detectChanges();
    expect(el.querySelectorAll('.pip')).toHaveLength(0);
  });
});
