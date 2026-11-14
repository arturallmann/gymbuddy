import { describe, expect, test } from 'vitest';
import { addExerciseHref, logExerciseHref, muscleGroupHref, parseCategory } from './addExercise';

describe('addresses of the Add exercise flow', () => {
  test('keep the category filter in the address', () => {
    expect(addExerciseHref()).toBe('/workout/add');
    expect(addExerciseHref('stretch')).toBe('/workout/add?category=stretch');
    expect(muscleGroupHref('g1')).toBe('/workout/add/muscle?id=g1');
    expect(muscleGroupHref('g1', 'cardio')).toBe('/workout/add/muscle?id=g1&category=cardio');
    expect(logExerciseHref('e1')).toBe('/workout/exercise?exercise=e1');
  });

  test('read only known categories', () => {
    expect(parseCategory('mobility')).toBe('mobility');
    expect(parseCategory('yoga')).toBeNull();
    expect(parseCategory(null)).toBeNull();
  });
});
