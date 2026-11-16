import { describe, expect, test } from 'vitest';
import {
  addExerciseHref,
  logExerciseHref,
  muscleGroupHref,
  parseCategory,
  workoutExerciseBack,
  workoutExerciseHref,
} from './addExercise';

describe('addresses of the Add exercise flow', () => {
  test('keep the category filter in the address', () => {
    expect(addExerciseHref()).toBe('/workout/add');
    expect(addExerciseHref('stretch')).toBe('/workout/add?category=stretch');
    expect(muscleGroupHref('g1')).toBe('/workout/add/muscle?id=g1');
    expect(muscleGroupHref('g1', 'cardio')).toBe('/workout/add/muscle?id=g1&category=cardio');
    expect(logExerciseHref('e1')).toBe('/workout/exercise?exercise=e1');
  });

  test('keep the list an exercise was opened from', () => {
    expect(logExerciseHref('e1', '/workout/add/muscle?id=g1&category=cardio')).toBe(
      '/workout/exercise?exercise=e1&back=%2Fworkout%2Fadd%2Fmuscle%3Fid%3Dg1%26category%3Dcardio',
    );
    expect(workoutExerciseHref('w1')).toBe('/workout/exercise?id=w1');
    expect(workoutExerciseHref('w1', '/workout/add')).toBe('/workout/exercise?id=w1&back=%2Fworkout%2Fadd');
  });

  test('go back only to the Add exercise flow, otherwise to the workout', () => {
    expect(workoutExerciseBack('/workout/add/muscle?id=g1')).toEqual({ href: '/workout/add/muscle?id=g1', label: 'Back to muscle group' });
    expect(workoutExerciseBack('/workout/add')).toEqual({ href: '/workout/add', label: 'Back to add exercise' });
    expect(workoutExerciseBack('/workout/add?category=stretch').label).toBe('Back to add exercise');
    const workout = { href: '/workout', label: 'Back to workout' };
    expect(workoutExerciseBack(null)).toEqual(workout);
    expect(workoutExerciseBack('/settings')).toEqual(workout);
    expect(workoutExerciseBack('//example.com/workout/add')).toEqual(workout);
    expect(workoutExerciseBack('/workout/added')).toEqual(workout);
  });

  test('read only known categories', () => {
    expect(parseCategory('mobility')).toBe('mobility');
    expect(parseCategory('yoga')).toBeNull();
    expect(parseCategory(null)).toBeNull();
  });
});
