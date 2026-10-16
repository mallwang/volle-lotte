import { TestBed } from '@angular/core/testing';
import { PlayerSeat } from './player-seat';

describe('PlayerSeat', () => {
  const make = (inputs: Record<string, unknown>) => {
    const f = TestBed.createComponent(PlayerSeat);
    f.componentRef.setInput('name', 'Ann');
    for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('shows name, score and a name that covers kind and states', () => {
    const el = make({ score: 300, you: true, active: true, online: false, computer: true });
    for (const t of ['Ann', 'Score: 300', 'You', 'Active', 'Offline'])
      expect(el.textContent).toContain(t);
    const label = el.querySelector('[role=group]')!.getAttribute('aria-label')!;
    for (const t of ['Ann', 'Computer', 'Score: 300', 'You', 'Active', 'Offline'])
      expect(label).toContain(t);
    expect(el.querySelector('.pi-desktop')).not.toBeNull();
    expect(el.querySelector('[aria-current=true]')).not.toBeNull();
  });

  it('shows plain human seats without markers', () => {
    const el = make({});
    expect(el.querySelector('.pi-user')).not.toBeNull();
    expect(el.querySelector('[aria-current]')).toBeNull();
    expect(el.querySelector('.vl-status')).toBeNull();
  });

  it('shows the timer only with a deadline', () => {
    expect(make({}).querySelector('app-turn-timer')).toBeNull();
    expect(make({ deadlineAt: Date.now() + 5000 }).querySelector('app-turn-timer')).not.toBeNull();
  });
});
