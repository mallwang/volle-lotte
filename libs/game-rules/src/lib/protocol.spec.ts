import {
  PROTOCOL_VERSION,
  UI_LANGUAGES,
  isUiLanguage,
  type Intents,
  type LogEntry,
  type SeatView,
} from './protocol.js';

describe('protocol', () => {
  it('has a version that includes language and computer names', () => {
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(8);
  });

  it('accepts exactly the supported UI languages', () => {
    expect(UI_LANGUAGES).toEqual(['en', 'de']);
    expect(isUiLanguage('en')).toBe(true);
    expect(isUiLanguage('de')).toBe(true);
    for (const x of ['fr', 'EN', '', undefined, null, 1]) expect(isUiLanguage(x)).toBe(false);
  });

  it('carries the language on session start and updates', () => {
    const start: Intents['session:start'][0] = {
      nickname: 'Ann',
      protocolVersion: PROTOCOL_VERSION,
      language: 'de',
    };
    const update: Intents['session:language'][0] = { language: 'en' };
    expect([start.language, update.language]).toEqual(['de', 'en']);
  });

  it('names computer seats and renames them by seat', () => {
    const seat: SeatView = { state: 'computer', name: 'Brave Fox' };
    const rename: Intents['seat:rename'][0] = { seat: 1, name: 'Rex' };
    const entry: LogEntry = { at: 0, kind: 'renamed', seat: 1, data: 'Brave Fox' };
    expect([seat.name, rename.name, entry.kind]).toEqual(['Brave Fox', 'Rex', 'renamed']);
  });
});
