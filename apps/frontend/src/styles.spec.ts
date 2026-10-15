import { readFileSync } from 'node:fs';

const css = readFileSync('apps/frontend/src/styles.css', 'utf8');

describe('global styles', () => {
  it('disables animation under prefers-reduced-motion', () => {
    const rule = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(rule).toContain('animation: none');
  });

  it('keeps interactive controls at least 44px', () => {
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('min-width: 44px');
  });
});
