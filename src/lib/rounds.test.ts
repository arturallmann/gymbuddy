import { expect, test } from 'vitest';
import { nextMemberIndex, roundComplete, roundRows } from './rounds';

test('build one row per round with a cell per member', () => {
  expect(roundRows([['a1', 'a2'], ['b1'], []])).toEqual([
    ['a1', 'b1', null],
    ['a2', null, null],
  ]);
  expect(roundRows([[], []])).toEqual([]);
});

test('pick the first member with the fewest sets', () => {
  expect(nextMemberIndex([0, 0, 0])).toBe(0);
  expect(nextMemberIndex([1, 0, 0])).toBe(1);
  expect(nextMemberIndex([2, 2, 1])).toBe(2);
  expect(nextMemberIndex([2, 3, 2])).toBe(0);
});

test('know when a round is complete', () => {
  expect(roundComplete([1, 1])).toBe(true);
  expect(roundComplete([2, 1])).toBe(false);
  expect(roundComplete([0, 0])).toBe(false);
  expect(roundComplete([])).toBe(false);
});
