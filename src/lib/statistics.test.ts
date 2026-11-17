import { describe, expect, test } from 'vitest';
import {
  bodyweightAt,
  exerciseSummaries,
  formatSetCount,
  muscleGroupSummaries,
  setVolume,
  spanRange,
  weeklyTotals,
  workoutTotals,
  type StatisticsExercise,
  type StatisticsInput,
} from './statistics';

const set = (weightGrams: number | null, reps: number | null, more: { durationSeconds?: number; distanceMeters?: number } = {}) => ({
  weightGrams,
  reps,
  durationSeconds: more.durationSeconds ?? null,
  distanceMeters: more.distanceMeters ?? null,
});

const external = { loadType: 'external', tracksReps: true, tracksDuration: false, tracksDistance: false } as const;

const bodyweight = { loadType: 'bodyweight', tracksReps: true, tracksDuration: false, tracksDistance: false } as const;

describe('bodyweightAt', () => {
  const entries = [
    { weightGrams: 80000, measuredAt: new Date(2026, 10, 1, 8) },
    { weightGrams: 85000, measuredAt: new Date(2026, 10, 10, 20) },
  ];

  test('use the newest bodyweight of that day or before', () => {
    expect(bodyweightAt(entries, new Date(2026, 10, 5, 18))).toBe(80000);
    expect(bodyweightAt(entries, new Date(2026, 10, 12, 18))).toBe(85000);
  });

  test('apply a bodyweight from the start of its day, so weighing after a workout counts for it', () => {
    expect(bodyweightAt(entries, new Date(2026, 10, 10, 7))).toBe(85000);
  });

  test('have no bodyweight before the first one', () => {
    expect(bodyweightAt(entries, new Date(2026, 9, 31, 18))).toBeNull();
    expect(bodyweightAt([], new Date())).toBeNull();
  });

  test('use the later of two bodyweights on one day', () => {
    const twice = [...entries, { weightGrams: 84000, measuredAt: new Date(2026, 10, 10, 21) }];
    expect(bodyweightAt(twice, new Date(2026, 10, 10, 18))).toBe(84000);
  });
});

describe('setVolume', () => {
  test('multiply weight and reps for external load', () => {
    expect(setVolume(set(60000, 8), 'external', null)).toBe(480000);
    expect(setVolume(set(null, 8), 'external', null)).toBeNull();
  });

  test('add the bodyweight to the added weight on a bodyweight exercise', () => {
    expect(setVolume(set(null, 5), 'bodyweight', 80000)).toBe(400000);
    expect(setVolume(set(10000, 5), 'bodyweight', 80000)).toBe(450000);
    expect(setVolume(set(-20000, 5), 'bodyweight', 80000)).toBe(300000);
  });

  test('give a bodyweight exercise no volume without a bodyweight', () => {
    expect(setVolume(set(10000, 5), 'bodyweight', null)).toBeNull();
  });

  test('give no volume without reps or for load type none', () => {
    expect(setVolume(set(60000, null), 'external', null)).toBeNull();
    expect(setVolume(set(null, 10), 'none', 80000)).toBeNull();
  });
});

describe('spanRange', () => {
  test('end at the next midnight and reach back 4 weeks, 3 months or a year', () => {
    const today = new Date(2026, 10, 15, 14);
    expect(spanRange('4w', today)).toEqual({ from: new Date(2026, 9, 19), to: new Date(2026, 10, 16) });
    expect(spanRange('3m', today)).toEqual({ from: new Date(2026, 7, 16), to: new Date(2026, 10, 16) });
    expect(spanRange('1y', today)).toEqual({ from: new Date(2025, 10, 16), to: new Date(2026, 10, 16) });
  });
});

describe('span statistics', () => {
  const muscle = (id: string, role: 'primary' | 'secondary') => ({ id, key: id, name: id, role });
  const exercises = new Map<string, StatisticsExercise>([
    ['bench', { id: 'bench', name: 'Bench Press', ...external, muscleGroups: [muscle('chest', 'primary'), muscle('triceps', 'secondary')] }],
    ['dip', { id: 'dip', name: 'Dips', ...bodyweight, muscleGroups: [muscle('triceps', 'primary'), muscle('chest', 'secondary')] }],
  ]);
  const monday = new Date(2026, 10, 2, 18);
  const nextMonday = new Date(2026, 10, 9, 18);
  const input: StatisticsInput = {
    rows: [
      { workoutId: 'w1', startedAt: monday, exerciseId: 'bench', set: set(100000, 5) },
      { workoutId: 'w1', startedAt: monday, exerciseId: 'bench', set: set(100000, 5) },
      { workoutId: 'w1', startedAt: monday, exerciseId: 'dip', set: set(null, 10) },
      { workoutId: 'w2', startedAt: nextMonday, exerciseId: 'dip', set: set(10000, 8) },
    ],
    exercises,
    // Bodyweight only from the second week: the first dips have no volume.
    bodyweights: [{ weightGrams: 80000, measuredAt: new Date(2026, 10, 9, 7) }],
  };

  test('add up workouts, sets and volume', () => {
    expect(workoutTotals(input)).toEqual({ workouts: 2, sets: 4, volume: 500000 + 500000 + 90000 * 8 });
  });

  test('count sets per muscle group: 1 for primary, ½ for secondary', () => {
    expect(muscleGroupSummaries(input)).toEqual([
      { id: 'chest', key: 'chest', name: 'chest', primarySets: 2, secondarySets: 1, volume: 1000000 + 720000 / 2, exercises: ['Bench Press', 'Dips'] },
      { id: 'triceps', key: 'triceps', name: 'triceps', primarySets: 2, secondarySets: 1, volume: 500000 + 720000, exercises: ['Bench Press', 'Dips'] },
    ]);
  });

  test('sum each exercise with its top value', () => {
    expect(exerciseSummaries(input).map((s) => [s.exercise.name, s.workouts, s.sets, s.volume, s.top])).toEqual([
      ['Dips', 2, 2, 720000, { kind: 'weight', value: 10000 }],
      ['Bench Press', 1, 2, 1000000, { kind: 'e1rm', value: 116667 }],
    ]);
  });

  test('put each workout in its week', () => {
    const weeks = weeklyTotals(input, { from: new Date(2026, 10, 2), to: new Date(2026, 10, 16) }, 1);
    expect(weeks.map((w) => [w.weekStart, w.workouts, w.sets, w.volume])).toEqual([
      [new Date(2026, 10, 2), 1, 3, 1000000],
      [new Date(2026, 10, 9), 1, 1, 720000],
    ]);
  });
});

describe('formatSetCount', () => {
  test('write set counts with halves and the right plural', () => {
    expect(formatSetCount(1)).toBe('1 set');
    expect(formatSetCount(0.5)).toBe('0.5 sets');
    expect(formatSetCount(7.25)).toBe('7.3 sets');
    expect(formatSetCount(0)).toBe('0 sets');
  });
});
