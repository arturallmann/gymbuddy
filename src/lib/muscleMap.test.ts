import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { BODY_AREAS, MAPPED_MUSCLE_GROUPS, heatLevel, muscleGroupLabel } from './muscleMap';

describe('heatLevel', () => {
  test('give the most trained muscle group the darkest shade and spread the rest over 1–5', () => {
    expect(heatLevel(14, 14)).toBe(5);
    expect(heatLevel(7, 14)).toBe(3);
    expect(heatLevel(0.5, 14)).toBe(1);
  });

  test('leave a muscle group without sets untrained', () => {
    expect(heatLevel(0, 14)).toBe(0);
    expect(heatLevel(0, 0)).toBe(0);
  });
});

describe('the drawing', () => {
  test('have an area for every muscle group of the exercise library', () => {
    const library: { primaryMuscles: string[]; secondaryMuscles: string[] }[] = JSON.parse(
      readFileSync(join(process.cwd(), 'data/free-exercise-db/exercises.json'), 'utf8'),
    );
    const keys = new Set(library.flatMap((exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles]));

    expect([...keys].filter((key) => !MAPPED_MUSCLE_GROUPS.includes(key))).toEqual([]);
  });

  test('show the back muscle groups only on the back and the front ones only on the front', () => {
    const on = (side: 'front' | 'back') => new Set(BODY_AREAS[side].map((area) => area.muscleGroup));
    expect(on('front').has('chest')).toBe(true);
    expect(on('back').has('chest')).toBe(false);
    expect(on('back').has('lats')).toBe(true);
    expect(on('front').has('lats')).toBe(false);
  });

  test('name a muscle group from its key', () => {
    expect(muscleGroupLabel('lower back')).toBe('Lower back');
  });
});
