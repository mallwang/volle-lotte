import { decodeLog, encodeLog, LOG_KINDS, type Event, type LogEntry } from 'game-rules';
import { gameView } from './testing';
import { isHost, isSpectator, logText, rematchState, seatName } from './game-view';
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

  it('names the player who lost points, not the one on turn', () => {
    const e: LogEntry = {
      at: 0,
      kind: 'turn',
      seat: 1,
      data: { type: 'penalty', player: 0, lost: 1000 },
    };
    expect(logText(game, e, i18n())).toBe('Ann lost 1000 points');
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

describe('rematch state', () => {
  it('waits for the host unless the view says otherwise', () => {
    expect(rematchState(gameView({ phase: 'finished' }))).toBe('waiting');
    expect(rematchState(gameView({ phase: 'finished', rematch: 'open' }))).toBe('open');
    expect(rematchState(gameView({ phase: 'finished', rematch: 'closed' }))).toBe('closed');
  });

  it('writes the rematch into the log', () => {
    const game = gameView({}, [
      { state: 'human', playerId: 'p0', nickname: 'Ann', connected: true },
    ]);
    const entry: LogEntry = { at: 0, kind: 'rematch', seat: 0 };
    expect(logText(game, entry, TestBed.inject(I18nService))).toBe('Ann started a rematch');
  });
});

describe('isSpectator', () => {
  it('is true only for a spectator view and never makes a spectator the host', () => {
    expect(isSpectator(gameView())).toBe(false);
    const view = gameView({
      you: { playerId: 'v1', seat: -1, timeoutWarning: false, spectator: true },
    });
    expect(isSpectator(view)).toBe(true);
    expect(isHost(view)).toBe(false);
  });
});

describe('log text of a compact log', () => {
  const result = {
    reason: 'targetScore' as const,
    winner: 0,
    ranking: [{ rank: 1, players: [0] }],
  };
  const events: Event[] = [
    { type: 'cardDrawn', card: 'plusMinus' },
    { type: 'thrown', dice: [1, 2, 3] },
    { type: 'selected', dice: [1], points: 100 },
    { type: 'volleLotte' },
    { type: 'bust', lost: 300 },
    { type: 'banked', points: 500 },
    { type: 'turnLost', lost: 100 },
    { type: 'turnEnded', next: 1 },
    { type: 'deckReshuffled' },
    { type: 'penalty', player: 1, lost: 500 },
    { type: 'gameOver', result },
  ];
  const log: LogEntry[] = [
    ...LOG_KINDS.filter((kind) => kind !== 'turn').map((kind, i) => ({
      at: i,
      kind,
      seat: i % 2,
      data: kind === 'replaced' ? 'left' : `x${i}`,
    })),
    ...events.map((data, i) => ({
      at: 100 + Math.floor(i / 2),
      kind: 'turn' as const,
      seat: 0,
      data,
    })),
  ];
  const game = gameView({}, [
    { state: 'human', playerId: 'p0', nickname: 'Ann', connected: true },
    { state: 'computer', name: 'Brave Fox', difficulty: 'easy', risk: 'medium' },
  ]);

  it.each(['en', 'de'] as const)('reads the same in %s after the trip over the wire', (lang) => {
    const i18n = TestBed.inject(I18nService);
    i18n.set(lang);
    const texts = (entries: LogEntry[]) => entries.map((e) => logText(game, e, i18n));
    const decoded = decodeLog(encodeLog(log));
    expect(decoded).toEqual(log);
    expect(texts(decoded)).toEqual(texts(log));
    expect(texts(decoded).every((t) => t.length > 0)).toBe(true);
  });
});
