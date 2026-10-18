import { TestBed } from '@angular/core/testing';
import { MIN_HEIGHT, MIN_WIDTH, TableScale, computeScale, modeFor } from './table-scale';

function resize(width: number, height: number): void {
  Object.assign(window, { innerWidth: width, innerHeight: height });
  window.dispatchEvent(new Event('resize'));
}

describe('computeScale / modeFor', () => {
  it('is 1 and full at 1920x950 and never enlarges', () => {
    expect(computeScale(1920, 950)).toBe(1);
    expect(computeScale(2560, 1440)).toBe(1);
    expect(modeFor(1)).toBe('full');
  });

  it('scales 1024x640 to about 0.71', () => {
    const s = computeScale(1024, 640);
    expect(s).toBeCloseTo(0.711, 2);
    expect(modeFor(s)).toBe('scaled');
  });

  it('is limited by the height at 1366x650', () => {
    expect(computeScale(1366, 650)).toBeCloseTo(650 / 900, 5);
  });

  it('blocks just below the minimum size', () => {
    expect([MIN_WIDTH, MIN_HEIGHT]).toEqual([695, 630]);
    expect(modeFor(computeScale(694, 900))).toBe('blocked');
    expect(modeFor(computeScale(1200, 629))).toBe('blocked');
    expect(modeFor(computeScale(695, 630))).toBe('scaled');
  });
});

describe('TableScale', () => {
  const original = [window.innerWidth, window.innerHeight];
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
      cb();
      return 1;
    });
    resize(1024, 640);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resize(original[0], original[1]);
  });

  it('reports 1 and full while disabled', () => {
    const s = TestBed.inject(TableScale);
    expect(s.scale()).toBe(1);
    expect(s.mode()).toBe('full');
  });

  it('follows the window while enabled', () => {
    const s = TestBed.inject(TableScale);
    s.enable();
    expect(s.mode()).toBe('scaled');
    resize(600, 600);
    expect(s.mode()).toBe('blocked');
    s.disable();
    expect(s.mode()).toBe('full');
  });

  it('keeps dismissed after a resize', () => {
    const s = TestBed.inject(TableScale);
    s.dismiss();
    resize(1920, 950);
    expect(s.dismissed()).toBe(true);
  });

  it('removes the listener on destroy', () => {
    const s = TestBed.inject(TableScale);
    s.enable();
    TestBed.resetTestingModule();
    resize(600, 600);
    expect(s.viewport().width).toBe(1024);
  });
});
