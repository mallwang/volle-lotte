import { hasScoringDie, scoreDice } from './scoring.js';

const on = { fourOfAKindDoubling: true };
const off = { fourOfAKindDoubling: false };

describe('scoreDice (ported from Java PunkteTest)', () => {
  it.each([
    [[1, 5, 5], 200],
    [[1, 1, 1], 1000],
    [[1, 1, 1, 1, 1], 4000],
    [[5, 5, 5], 500],
    [[4, 4, 4], 400],
    [[6, 6, 6, 6], 1200],
    [[1, 2], -1],
    [[3, 3], -1],
    [[], 0],
  ])('%j scores %i', (dice, points) => {
    expect(scoreDice(dice, on)).toBe(points);
  });

  it('without doubling extra dice score as singles or invalidate the set', () => {
    expect(scoreDice([1, 1, 1, 1], off)).toBe(1100);
    expect(scoreDice([5, 5, 5, 5], off)).toBe(550);
    expect(scoreDice([4, 4, 4, 4], off)).toBe(-1);
    expect(scoreDice([4, 4, 4], off)).toBe(400);
  });
});

describe('hasScoringDie', () => {
  it.each([
    [[2, 3, 4, 6, 2, 4], false],
    [[2, 2, 2, 3, 4, 6], true],
    [[4, 4, 4], true],
    [[2, 3, 4, 6, 2, 5], true],
  ])('%j -> %s', (dice, expected) => {
    expect(hasScoringDie(dice)).toBe(expected);
  });
});
