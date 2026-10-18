import { TestBed } from '@angular/core/testing';
import { I18nService } from '../core/i18n.service';
import { TableScale } from '../core/table-scale';
import { WindowTooSmall } from './window-too-small';

describe('WindowTooSmall', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  it('names the required and the current size', () => {
    TestBed.inject(TableScale).viewport.set({ width: 600, height: 500 });
    const fixture = TestBed.createComponent(WindowTooSmall);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('695 x 630');
    expect(text).toContain('600 x 500');
    expect(text).toContain('keeps running');
  });

  it('is translated to German', () => {
    TestBed.inject(I18nService).set('de');
    const fixture = TestBed.createComponent(WindowTooSmall);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Fenster zu klein');
  });
});
