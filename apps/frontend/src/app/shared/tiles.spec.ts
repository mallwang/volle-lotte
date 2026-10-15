import { TestBed } from '@angular/core/testing';
import { CardTile } from './card-tile';
import { DiceTile } from './dice-tile';
import { PlayerTile } from './player-tile';

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
  });

  it('card tile shows the label or none', () => {
    const f = TestBed.createComponent(CardTile);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('none');
    f.componentRef.setInput('card', 'star');
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('star');
  });

  it('player tile marks active, role, offline and score', () => {
    const f = TestBed.createComponent(PlayerTile);
    f.componentRef.setInput('name', 'Ann');
    f.componentRef.setInput('score', 300);
    f.componentRef.setInput('role', 'Host');
    f.componentRef.setInput('active', true);
    f.componentRef.setInput('online', false);
    f.componentRef.setInput('reconnect', 'Reconnect: 20 s');
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('[aria-current="true"]')).not.toBeNull();
    for (const t of ['Ann', 'Active', 'Host', 'Reconnect: 20 s', 'Score: 300'])
      expect(el.textContent).toContain(t);
    f.componentRef.setInput('active', false);
    f.componentRef.setInput('online', true);
    f.componentRef.setInput('score', null);
    f.detectChanges();
    expect(el.querySelector('[aria-current]')).toBeNull();
    expect(el.textContent).not.toContain('Score');
    expect(el.textContent).not.toContain('Offline');
  });
});
