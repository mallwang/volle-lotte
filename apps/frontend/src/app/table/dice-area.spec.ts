import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { DiceArea, type TurnAction } from './dice-area';

describe('DiceArea', () => {
  const run = vi.fn();
  const actions: TurnAction[] = ['draw', 'throw', 'select', 'bank'].map((id) => ({
    id,
    label: id,
    reason: id === 'bank' ? 'nope' : null,
    run,
  }));
  const make = (inputs: Record<string, unknown>) => {
    TestBed.configureTestingModule({ providers: [providePrimeNG()] });
    const f = TestBed.createComponent(DiceArea);
    f.componentRef.setInput('dice', [1, 5, 2]);
    f.componentRef.setInput('actions', actions);
    for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  };
  const tiles = (el: HTMLElement) =>
    [...el.querySelectorAll('app-dice-tile button')] as HTMLButtonElement[];

  it('emits toggled and disables dice unless selectable', () => {
    const { f, el } = make({ canSelect: true });
    const out = vi.fn();
    f.componentInstance.toggled.subscribe(out);
    tiles(el)[1].click();
    expect(out).toHaveBeenCalledWith(1);
  });

  it('disables dice when not selectable', () => {
    expect(tiles(make({}).el).every((b) => b.disabled)).toBe(true);
  });

  it('runs enabled actions and hides those with a reason', () => {
    const { el } = make({ mine: true, aside: [{ dice: [1], points: 100 }] });
    const btn = (t: string) =>
      [...el.querySelectorAll('.vl-action button')].find(
        (b) => b.textContent?.trim() === t,
      ) as HTMLButtonElement;
    btn('throw').click();
    expect(run).toHaveBeenCalled();
    expect(btn('bank') as HTMLButtonElement | undefined).toBeUndefined();
  });

  it('offers banking only once points are secured', () => {
    expect(make({ mine: true }).el.textContent).not.toContain('bank');
  });

  it('hides the action buttons when it is not my turn', () => {
    expect(make({}).el.querySelector('.vl-action')).toBeNull();
  });

  it('shows the bust notice, points and the minimum hint', () => {
    const { el } = make({
      notice: { text: 'Busted!' },
      safeText: 'Secured: 250 points',
      minimum: 300,
    });
    expect(el.querySelector('.vl-bust')!.textContent).toContain('Busted!');
    expect(el.querySelector('.vl-safe')!.textContent).toContain('250');
    expect(el.querySelector('.vl-safe > small')!.textContent).toMatch(/300/);
  });

  it('shows Street progress with missing values marked', () => {
    const { el } = make({ street: [1, 2] });
    expect(el.querySelectorAll('.vl-street .vl-missing')).toHaveLength(4);
  });

  it('shows set-aside groups with points', () => {
    const { el } = make({ aside: [{ dice: [1, 1], points: 200 }] });
    expect(el.querySelector('.vl-aside-group')!.textContent).toContain('+200');
  });
});
