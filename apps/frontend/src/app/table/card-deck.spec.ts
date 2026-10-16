import { TestBed } from '@angular/core/testing';
import { CardDeck } from './card-deck';

describe('CardDeck', () => {
  const make = (size: number, total = 60) => {
    const f = TestBed.createComponent(CardDeck);
    f.componentRef.setInput('size', size);
    f.componentRef.setInput('total', total);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it.each([
    [60, 6, 'many'],
    [30, 4, 'medium'],
    [10, 2, 'few'],
    [0, 0, 'empty'],
  ])('size %i → %i layers (%s)', (size, layers, level) => {
    const el = make(size);
    expect(el.querySelectorAll('.lay')).toHaveLength(layers);
    expect(el.querySelector('.vl-pile')!.classList.contains('empty')).toBe(level === 'empty');
    expect(el.querySelector('[role=img]')!.getAttribute('aria-label')).toBe(
      `Draw pile: ${size} cards (${level})`,
    );
    expect(el.querySelector('.vl-pile-label')!.textContent).toBe(String(size));
  });
});
