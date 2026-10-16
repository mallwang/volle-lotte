import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { TurnTimer } from './turn-timer';

describe('TurnTimer', () => {
  it('animates for the time left and restarts on a new deadline', async () => {
    TestBed.configureTestingModule({ providers: [providePrimeNG()] });
    const fixture = TestBed.createComponent(TurnTimer);
    fixture.componentRef.setInput('at', Date.now() + 10_000);
    await fixture.whenStable();
    const bar = () => fixture.nativeElement.querySelector('.vl-bust-timer') as HTMLElement;
    const first = bar();
    expect(parseFloat(first.style.animationDuration)).toBeGreaterThan(9000);
    fixture.componentRef.setInput('at', Date.now() + 15_000);
    await fixture.whenStable();
    expect(bar()).not.toBe(first);
    expect(parseFloat(bar().style.animationDuration)).toBeGreaterThan(14_000);
  });
});
