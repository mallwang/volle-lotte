import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 32;

/** Returns `salt:hash`, both base64. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString('base64')}:${scryptSync(password, salt, KEY_LENGTH).toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}
