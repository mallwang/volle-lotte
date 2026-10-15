import { AttemptLimiter } from './attempt-limiter';

describe('AttemptLimiter', () => {
  let t: number;
  let limiter: AttemptLimiter;
  beforeEach(() => {
    t = 0;
    limiter = new AttemptLimiter(() => t);
  });

  it('counts attempts left and locks after 5 failures', () => {
    expect([1, 2, 3, 4].map(() => limiter.fail('c', 'g'))).toEqual([4, 3, 2, 1]);
    expect(limiter.retryAfterMs('c', 'g')).toBe(0);
    expect(limiter.fail('c', 'g')).toBe(0);
    expect(limiter.retryAfterMs('c', 'g')).toBe(600_000);
    t = 599_999;
    expect(limiter.retryAfterMs('c', 'g')).toBe(1);
    t = 600_000;
    expect(limiter.retryAfterMs('c', 'g')).toBe(0);
  });

  it('forgets old failures after the 10 minute window', () => {
    limiter.fail('c', 'g');
    t = 600_000;
    expect(limiter.fail('c', 'g')).toBe(4);
  });

  it('clears on success and separates clients and games', () => {
    limiter.fail('c', 'g');
    limiter.fail('c', 'g');
    expect(limiter.fail('other', 'g')).toBe(4);
    expect(limiter.fail('c', 'h')).toBe(4);
    limiter.succeed('c', 'g');
    expect(limiter.fail('c', 'g')).toBe(4);
  });

  it('forgets a removed game', () => {
    for (let i = 0; i < 5; i++) limiter.fail('c', 'g');
    limiter.forgetGame('g');
    expect(limiter.retryAfterMs('c', 'g')).toBe(0);
  });
});
