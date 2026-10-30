import { expect, test } from 'vitest';
import { remainingSeconds, stepDuration } from './timer';

test('count whole seconds left and stop at zero', () => {
  expect(remainingSeconds(10_000, 0)).toBe(10);
  expect(remainingSeconds(10_000, 9_800)).toBe(1);
  expect(remainingSeconds(10_000, 10_000)).toBe(0);
  expect(remainingSeconds(10_000, 12_000)).toBe(0);
});

test('change the length in steps of 15 seconds, between 15 seconds and one hour', () => {
  expect(stepDuration(30, 1)).toBe(45);
  expect(stepDuration(30, -1)).toBe(15);
  expect(stepDuration(15, -1)).toBe(15);
  expect(stepDuration(3600, 1)).toBe(3600);
});
