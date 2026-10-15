import type { GameView, LogEntry, SeatView } from 'game-rules';
import type { I18nService } from './i18n.service';

export const isHost = (g: GameView): boolean => g.hostId === g.you.playerId;

/** Seat numbers of the engine players (engine index = position among occupied seats). */
export function playerSeats(g: GameView): number[] {
  return g.seats.flatMap((s, i) => (s.state === 'human' || s.state === 'computer' ? [i] : []));
}

export const seatName = (s: SeatView | undefined, i18n: I18nService): string =>
  s?.nickname ?? i18n.t('player.computer');

export function logText(g: GameView, e: LogEntry, i18n: I18nService): string {
  const who = e.seat === undefined ? '' : seatName(g.seats[e.seat], i18n);
  if (e.kind === 'turn' && typeof e.data === 'object') {
    const ev = e.data;
    const t = (key: string, params: Record<string, string | number> = {}) =>
      i18n.t(`log.${key}`, { who, ...params });
    switch (ev.type) {
      case 'cardDrawn':
        return t('drew', { card: i18n.t(`card.${ev.card}`) });
      case 'thrown':
        return t('threw', { dice: ev.dice.join(' ') });
      case 'selected':
        // Street: dice count by value, not points
        return ev.points > 0
          ? t('selectedPoints', { dice: ev.dice.join(' '), points: ev.points })
          : t('selected', { dice: ev.dice.join(' ') });
      case 'volleLotte':
        return t('volleLotte');
      case 'bust':
        return t('bust', { lost: ev.lost });
      case 'banked':
        return t('banked', { points: ev.points });
      case 'turnLost':
        return t('turnLost', { lost: ev.lost });
      case 'turnEnded':
        return t('turnEnded');
      case 'deckReshuffled':
        return t('deckReshuffled');
      case 'penalty':
        return t('penalty', { lost: ev.lost });
      case 'gameOver':
        return t('gameOver');
    }
  }
  return i18n.t(`log.${e.kind}`, { who }).trim();
}
