import type { LogEntry } from 'game-rules';
import { gameView } from './testing';
import { logText, seatName } from './game-view';
import { I18nService } from './i18n.service';
import { TestBed } from '@angular/core/testing';

describe('game view names', () => {
  const i18n = () => TestBed.inject(I18nService);
  const game = gameView({}, [
    { state: 'human', playerId: 'p0', nickname: 'Ann', connected: true },
    { state: 'computer', name: 'Brave Fox', difficulty: 'easy', risk: 'medium' },
  ]);

  it('uses the nickname of a human and the server name of a computer', () => {
    expect(seatName(game.seats[0])).toBe('Ann');
    expect(seatName(game.seats[1])).toBe('Brave Fox');
    expect(seatName(game.seats[2])).toBe('');
    expect(seatName(undefined)).toBe('');
  });

  it('names computers in log entries and shows the old name of a rename', () => {
    const played: LogEntry = { at: 0, kind: 'turn', seat: 1, data: { type: 'turnEnded', next: 0 } };
    const renamed: LogEntry = { at: 0, kind: 'renamed', seat: 1, data: 'Sly Owl' };
    expect(logText(game, played, i18n())).toBe('Brave Fox ended the turn');
    expect(logText(game, renamed, i18n())).toBe('Sly Owl is now called Brave Fox');
  });

  it('names the human a computer replaced', () => {
    const replaced = gameView({}, [
      { state: 'human', playerId: 'p0', nickname: 'Ann', connected: true },
      {
        state: 'computer',
        name: 'Brave Fox',
        difficulty: 'random',
        risk: 'random',
        former: { nickname: 'Pia' },
      },
    ]);
    const entry: LogEntry = { at: 0, kind: 'replaced', seat: 1, data: 'left' };
    expect(logText(replaced, entry, i18n())).toContain('Pia left');
  });
});
