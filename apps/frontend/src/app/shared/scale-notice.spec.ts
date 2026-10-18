import { TestBed } from '@angular/core/testing';
import { I18nService } from '../core/i18n.service';
import { TableScale } from '../core/table-scale';
import { ScaleNotice } from './scale-notice';

function render() {
  const fixture = TestBed.createComponent(ScaleNotice);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('ScaleNotice', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  it('shows the rounded percent and dismisses', () => {
    const scale = TestBed.inject(TableScale);
    scale.viewport.set({ width: 1024, height: 640 });
    scale.enable();
    const { fixture, el } = render();
    expect(el.textContent).toContain('(71%)');
    el.querySelector('button')!.click();
    fixture.detectChanges();
    expect(scale.dismissed()).toBe(true);
  });

  it('is translated to German', () => {
    TestBed.inject(TableScale).enable();
    TestBed.inject(I18nService).set('de');
    expect(render().el.textContent).toContain('angepasst');
  });
});
