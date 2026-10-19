import { defaultRules } from '../types.js';
import { MAX_TABLES } from './constants.js';
import { snapKappa, tableCount, tableFor } from './value.js';

const rules = defaultRules();

describe('ValueTable', () => {
  it('banks at the best value when throwing cannot improve', () => {
    const table = tableFor(rules, 'bonus', 0, 400, 0);
    expect(table.value(1, 2000)).toBe(2000);
    expect(table.value(6, 0)).toBeGreaterThan(0);
  });

  it('never banks below the minimum or with nothing to bank', () => {
    const table = tableFor(rules, 'bonus', 0, 400, 0);
    expect(table.bank(0)).toBe(-Infinity);
    expect(table.bank(300)).toBe(-Infinity);
    expect(table.bank(350)).toBe(350);
  });

  it('is monotone in the run points', () => {
    const table = tableFor(rules, 'bonus', 0, 400, 0);
    let last = -Infinity;
    for (let run = 0; run <= 1500; run += 50) {
      const v = table.value(4, run);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });

  it('a larger loss weight never raises the value of continuing', () => {
    const calm = tableFor(rules, 'bonus', 500, 400, 0).throwValue(3, 500);
    const scared = tableFor(rules, 'bonus', 500, 400, 1).throwValue(3, 500);
    expect(scared).toBeLessThan(calm);
  });

  it('prefers banking a big run to a single die', () => {
    const table = tableFor(rules, 'bonus', 0, 400, 0);
    expect(table.bank(1500)).toBeGreaterThan(table.throwValue(1, 1500));
  });

  it.each([0, 500])('never values early banking on Double Lotte with %i carried', (carried) => {
    const table = tableFor(rules, 'double', carried, 0, 0);
    expect(table.bank(1000)).toBe(-Infinity);
    expect(table.value(1, 1000)).toBeCloseTo((2 * carried + 2200 + 2100) / 6, 9);
    expect(table.value(1, 5000)).toBeCloseTo((2 * carried + 10200 + 10100) / 6, 9);
  });

  it('shares tables and stays bounded under many distinct minimum points', () => {
    expect(tableFor(rules, 'bonus', 0, 400, 0)).toBe(tableFor(rules, 'bonus', 100, 400, 0.01));
    for (let minimumPoints = 0; minimumPoints < 3 * MAX_TABLES; minimumPoints += 1) {
      tableFor({ ...rules, minimumPoints }, 'bonus', 0, 400, 0).value(6, 0);
    }
    expect(tableCount()).toBeLessThanOrEqual(MAX_TABLES);
  });

  it('snaps kappa to the grid and clamps it', () => {
    expect(snapKappa(0.07)).toBeCloseTo(0.05, 9);
    expect(snapKappa(99)).toBe(2);
    expect(snapKappa(-99)).toBe(-0.5);
  });
});
