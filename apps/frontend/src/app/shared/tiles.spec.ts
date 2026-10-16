import { TestBed } from '@angular/core/testing';
import { DiceTile } from './dice-tile';

describe('tiles', () => {
  it('dice tile toggles and exposes state', () => {
    const f = TestBed.createComponent(DiceTile);
    f.componentRef.setInput('value', 4);
    const toggled = vi.fn();
    f.componentInstance.toggled.subscribe(toggled);
    f.detectChanges();
    const btn: HTMLButtonElement = f.nativeElement.querySelector('button');
    expect(btn.getAttribute('aria-label')).toBe('Die 4, not selected');
    btn.click();
    expect(toggled).toHaveBeenCalledOnce();
    f.componentRef.setInput('selected', true);
    f.componentRef.setInput('disabled', true);
    f.detectChanges();
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('aria-label')).toBe('Die 4, selected');
    expect(btn.disabled).toBe(true);
    expect(btn.querySelectorAll('.pip')).toHaveLength(4);
    expect(btn.classList.contains('vl-die-selected')).toBe(true);
    expect(btn.textContent?.trim()).toBe('');
    f.componentRef.setInput('value', null);
    f.detectChanges();
    expect(btn.querySelectorAll('.pip')).toHaveLength(0);
  });
});
