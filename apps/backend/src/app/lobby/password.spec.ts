import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('verifies the right password only', () => {
    const stored = hashPassword('geheim');
    expect(verifyPassword('geheim', stored)).toBe(true);
    expect(verifyPassword('Geheim', stored)).toBe(false);
  });

  it('salts every hash and never stores the clear text', () => {
    const a = hashPassword('geheim');
    expect(a).not.toBe(hashPassword('geheim'));
    expect(a).not.toContain('geheim');
    expect(a.split(':')).toHaveLength(2);
  });

  it('rejects malformed stored values', () => {
    expect(verifyPassword('x', '')).toBe(false);
    expect(verifyPassword('x', 'abc')).toBe(false);
  });
});
