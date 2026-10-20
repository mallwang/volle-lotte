import { AttemptLimiter, RateLimiter } from './attempt-limiter';

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

describe('RateLimiter', () => {
  it('allows max calls per window and tells how long to wait after that', () => {
    let now = 1000;
    const limiter = new RateLimiter(2, 10_000, () => now);
    expect(limiter.take('a')).toBe(0);
    now += 1000;
    expect(limiter.take('a')).toBe(0);
    now += 1000;
    expect(limiter.take('a')).toBe(8000);
  });

  it('counts keys separately and frees a slot when the oldest call leaves the window', () => {
    let now = 0;
    const limiter = new RateLimiter(1, 1000, () => now);
    expect(limiter.take('a')).toBe(0);
    expect(limiter.take('b')).toBe(0);
    now = 400;
    expect(limiter.take('a')).toBe(600);
    now = 1000;
    expect(limiter.take('a')).toBe(0);
  });
});
