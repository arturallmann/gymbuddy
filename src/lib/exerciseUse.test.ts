import { describe, expect, test } from 'vitest';
import { formatUse, splitByUse } from './exerciseUse';

const items = ['Barbell Full Squat', 'Barbell Squat', 'Box Squat', 'Goblet Squat', 'Zercher Squat'].map((name) => ({ id: name, name }));
const day = (d: number) => new Date(2026, 10, d);

describe('splitByUse', () => {
  test('put done exercises first, the most frequent first, and keep the rest in order', () => {
    const use = new Map([
      ['Goblet Squat', { workouts: 1, lastAt: day(14) }],
      ['Barbell Squat', { workouts: 12, lastAt: day(12) }],
    ]);

    const { doneBefore, rest } = splitByUse(items, use);

    expect(doneBefore.map((item) => item.name)).toEqual(['Barbell Squat', 'Goblet Squat']);
    expect(rest.map((item) => item.name)).toEqual(['Barbell Full Squat', 'Box Squat', 'Zercher Squat']);
  });

  test('break ties by the newest workout, then by name', () => {
    const use = new Map([
      ['Box Squat', { workouts: 2, lastAt: day(1) }],
      ['Zercher Squat', { workouts: 2, lastAt: day(9) }],
      ['Barbell Squat', { workouts: 2, lastAt: day(1) }],
    ]);

    expect(splitByUse(items, use).doneBefore.map((item) => item.name)).toEqual(['Zercher Squat', 'Barbell Squat', 'Box Squat']);
  });

  test('leave the list as it is without any use', () => {
    expect(splitByUse(items, new Map())).toEqual({ doneBefore: [], rest: items });
  });
});

test('say how many workouts', () => {
  expect(formatUse({ workouts: 1, lastAt: day(1) })).toBe('1 workout');
  expect(formatUse({ workouts: 12, lastAt: day(1) })).toBe('12 workouts');
});
