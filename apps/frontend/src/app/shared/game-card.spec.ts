import { TestBed } from '@angular/core/testing';
import type { CardType } from 'game-rules';
import { I18nService } from '../core/i18n.service';
import { GameCard } from './game-card';

describe('GameCard', () => {
  afterEach(() => TestBed.inject(I18nService).set('en'));

  const make = (card: CardType | null) => {
    const f = TestBed.createComponent(GameCard);
    f.componentRef.setInput('card', card);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('shows value, icon and name of a bonus card', () => {
    const el = make('bonus400');
    expect(el.querySelector('.val')!.textContent).toBe('+400');
    expect(el.querySelector('.icn')).not.toBeNull();
    expect(el.querySelector('.nm')!.textContent).toBe('Bonus 400');
    expect(el.querySelector('[role=img]')!.getAttribute('aria-label')).toBe('Card: Bonus 400');
  });

  it('shows no value for non-bonus cards', () => {
    expect(make('star').querySelector('.val')!.textContent).toBe('');
  });

  it('follows the language', () => {
    TestBed.inject(I18nService).set('de');
    expect(make('stop').querySelector('.nm')!.textContent).toBe('Stopp');
    expect(make('street').querySelector('.nm')!.textContent).toBe('Straße');
  });

  it('renders an empty slot without a card', () => {
    const el = make(null);
    expect(el.querySelector('.vl-gcard.empty')).not.toBeNull();
    expect(el.querySelector('.icn')).toBeNull();
  });
});
