import { describe, expect, test } from 'vitest';
import { exerciseBrowserHref, exerciseDetailBack, exerciseDetailHref, parseBrowserFilter } from './exerciseBrowser';

describe('addresses of the exercise browser', () => {
  test('write the filters into the address and read them back', () => {
    const empty = { query: '', muscleGroupId: '', category: null, customOnly: false };
    expect(exerciseBrowserHref(empty)).toBe('/exercises');
    expect(parseBrowserFilter(new URLSearchParams())).toEqual(empty);

    const filter = { query: 'bench & press', muscleGroupId: 'g1', category: 'strength' as const, customOnly: true };
    const href = exerciseBrowserHref(filter);
    expect(href).toBe('/exercises?q=bench+%26+press&muscle=g1&category=strength&custom=1');
    expect(parseBrowserFilter(new URLSearchParams(href.split('?')[1]))).toEqual(filter);
  });

  test('ignore an unknown category', () => {
    expect(parseBrowserFilter(new URLSearchParams('category=yoga')).category).toBeNull();
  });

  test('link an exercise page with the browser address as back', () => {
    expect(exerciseDetailHref('e1')).toBe('/exercises/detail?id=e1');
    expect(exerciseDetailHref('e1', '/exercises?muscle=g1')).toBe('/exercises/detail?id=e1&back=%2Fexercises%3Fmuscle%3Dg1');
  });

  test('go back only to the exercise browser', () => {
    expect(exerciseDetailBack('/exercises?muscle=g1')).toBe('/exercises?muscle=g1');
    expect(exerciseDetailBack('/exercises')).toBe('/exercises');
    expect(exerciseDetailBack(null)).toBe('/exercises');
    expect(exerciseDetailBack('/settings')).toBe('/exercises');
    expect(exerciseDetailBack('/exercises/edit')).toBe('/exercises');
  });
});
