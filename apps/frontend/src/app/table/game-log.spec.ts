import { TestBed } from '@angular/core/testing';
import type { LogEntry } from 'game-rules';
import { GameLog } from './game-log';

describe('GameLog', () => {
  it('renders entries in a log region with framed dice', () => {
    const f = TestBed.createComponent(GameLog);
    const entries = [{ kind: 'joined' }, { kind: 'left' }] as LogEntry[];
    f.componentRef.setInput('entries', entries);
    f.componentRef.setInput('parts', (e: LogEntry) =>
      e.kind === 'joined'
        ? [
            { text: 'Ann threw ', die: false },
            { text: '6', die: true },
          ]
        : [{ text: 'Bob left', die: false }],
    );
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=log]')).not.toBeNull();
    expect(el.querySelectorAll('li')).toHaveLength(2);
    expect(el.querySelector('.vl-log-die')).not.toBeNull();
    expect(el.textContent).toContain('Bob left');
  });
});
