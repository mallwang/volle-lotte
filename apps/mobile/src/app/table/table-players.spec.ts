import { TestBed } from '@angular/core/testing';
import { fakeSocket } from '../core/testing';
import { computer, human, running } from './testing';
import { TablePlayers } from './table-players';

function render(view: ReturnType<typeof running>, activeIndex: number | null = null) {
  fakeSocket();
  const fixture = TestBed.createComponent(TablePlayers);
  fixture.componentRef.setInput('view', view);
  fixture.componentRef.setInput('activeIndex', activeIndex);
  fixture.detectChanges();
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')];
}

describe('TablePlayers', () => {
  it('lists every player with score, marks the active one and tags computer and offline', () => {
    const seats = [
      human('p0', 'Anna'),
      { ...human('p1', 'Ben'), connected: false },
      computer('Robo'),
    ];
    const rows = render(running({}, { seats, current: 1 }));
    expect(rows).toHaveLength(3);
    expect(rows[1].classList).toContain('active');
    expect(rows[1].textContent).toContain('offline');
    expect(rows[2].textContent).toContain('Computer');
    expect(rows[0].textContent).toContain('you');
  });

  it('keeps the roller active while a notice is shown', () => {
    const rows = render(running({}, { current: 1 }), 0);
    expect(rows[0].classList).toContain('active');
    expect(rows[1].classList).not.toContain('active');
  });

  it('fits eight seats', () => {
    const seats = Array.from({ length: 8 }, (_, i) => human(`p${i}`, `P${i}`));
    expect(render(running({}, { seats }))).toHaveLength(8);
  });
});
