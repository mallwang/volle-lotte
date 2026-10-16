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

  it('shows the hand-drawn picture, labelled with the card name', () => {
    const el = make('bonus400');
    expect(el.querySelector('img')!.getAttribute('src')).toBe('/cards/bonus-400.png');
    expect(el.querySelector('[role=img]')!.getAttribute('aria-label')).toBe('Card: Bonus 400');
  });

  it('follows the language', () => {
    TestBed.inject(I18nService).set('de');
    expect(make('stop').querySelector('[role=img]')!.getAttribute('aria-label')).toContain('Stopp');
  });

  it('renders an empty slot without a card', () => {
    const el = make(null);
    expect(el.querySelector('.vl-gcard.empty')).not.toBeNull();
    expect(el.querySelector('img')).toBeNull();
  });
});
