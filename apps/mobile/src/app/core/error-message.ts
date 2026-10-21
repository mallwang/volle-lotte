import type { ErrorAck } from 'game-rules';
import type { MobileI18nService } from './i18n.service';

export function errorMessage(ack: ErrorAck, i18n: MobileI18nService): string {
  if (ack.reason === 'wrongPassword' && ack.attemptsLeft !== undefined)
    return i18n.t('error.wrongPasswordLeft', { attemptsLeft: ack.attemptsLeft });
  if (ack.reason === 'locked' && ack.retryAfterMs !== undefined)
    return i18n.t('error.lockedRetry', { seconds: Math.ceil(ack.retryAfterMs / 1000) });
  return i18n.t(`error.${ack.reason}`);
}
