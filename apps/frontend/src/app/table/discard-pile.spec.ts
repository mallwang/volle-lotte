import { TestBed } from '@angular/core/testing';
import { DiscardPile } from './discard-pile';

describe('DiscardPile', () => {
  const make = (played: number) => {
    const f = TestBed.createComponent(DiscardPile);
    f.componentRef.setInput('played', played);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };
  const layers = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.lay')];

  it('shows an empty outline with no layers at 0', () => {
    const el = make(0);
    expect(layers(el)).toHaveLength(0);
    expect(el.querySelector('[role=img]')!.getAttribute('aria-label')).toBe(
      'Discard pile: 0 cards',
    );
  });

  it('grows with played cards and caps at 8 layers', () => {
    expect(layers(make(1))).toHaveLength(0);
    expect(layers(make(2))).toHaveLength(1);
    expect(layers(make(13))).toHaveLength(2);
    expect(layers(make(500))).toHaveLength(8);
  });

  it('shows the first discarded card without a background card', () => {
    const f = TestBed.createComponent(DiscardPile);
    f.componentRef.setInput('played', 1);
    f.componentRef.setInput('previous', 'bonus200');
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('app-game-card')).not.toBeNull();
    expect(el.querySelector('.discard.empty')).toBeNull();
    expect(layers(el)).toHaveLength(0);
  });

  it('keeps earlier layer transforms when the pile grows', () => {
    const small = layers(make(6)).map((l) => l.style.transform);
    const big = layers(make(30)).map((l) => l.style.transform);
    expect(big.slice(0, small.length)).toEqual(small);
  });
});
