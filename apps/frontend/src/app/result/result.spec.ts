import { TestBed } from '@angular/core/testing';
import { defaultRules } from 'game-rules';
import { SocketService } from '../core/socket.service';
import { gameView, stubSocket } from '../core/testing';
import { Result } from './result';

describe('Result', () => {
  it('shows shared ranks and leaves the game', async () => {
    const socket = stubSocket(
      gameView({
        phase: 'finished',
        game: {
          version: 1,
          rules: defaultRules(),
          players: [
            { name: 'Ann', score: 6000 },
            { name: 'Bob', score: 3000 },
            { name: 'Cy', score: 3000 },
          ],
          current: 0,
          deckSize: 10,
          turn: null,
          result: {
            reason: 'targetScore',
            winner: 0,
            ranking: [
              { rank: 1, players: [0] },
              { rank: 2, players: [1, 2] },
            ],
          },
        },
      }),
    );
    TestBed.configureTestingModule({
      imports: [Result],
      providers: [{ provide: SocketService, useValue: socket }],
    });
    const fixture = TestBed.createComponent(Result);
    await fixture.whenStable();
    const items = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')];
    expect(items[0].textContent).toMatch(/Rank 1:\s*Ann/);
    expect(items[1].textContent).toMatch(/Rank 2:\s*Bob \(3000\),\s*Cy \(3000\)/);
    fixture.nativeElement.querySelector('button').click();
    expect(socket.leave).toHaveBeenCalled();
  });
});
