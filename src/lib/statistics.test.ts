import { describe, expect, test } from 'vitest';
import {
  bodyweightAt,
  byWorkout,
  estimatedOneRepMax,
  exerciseSummaries,
  formatPersonalRecord,
  muscleGroupSummaries,
  personalRecords,
  personalRecordKinds,
  newPersonalRecordsIn,
  setVolume,
  spanRange,
  weeklyTotals,
  workoutTotals,
  type StatisticsExercise,
  type StatisticsInput,
} from './statistics';

const kg = { weightUnit: 'kg', distanceUnit: 'metric' } as const;
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

describe('estimatedOneRepMax', () => {
  test('use Epley: weight × (1 + reps ÷ 30)', () => {
    expect(estimatedOneRepMax(100000, 5)).toBe(116667);
    expect(estimatedOneRepMax(60000, 12)).toBe(84000);
  });

  test('take a single rep as its own weight', () => {
    expect(estimatedOneRepMax(140000, 1)).toBe(140000);
  });

  test('give no e1RM above 12 reps, without reps or without weight', () => {
    expect(estimatedOneRepMax(60000, 13)).toBeNull();
    expect(estimatedOneRepMax(60000, null)).toBeNull();
    expect(estimatedOneRepMax(null, 5)).toBeNull();
    expect(estimatedOneRepMax(0, 5)).toBeNull();
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

describe('personalRecordKinds', () => {
  test('give external exercises e1RM, heaviest weight and volume', () => {
    expect(personalRecordKinds(external)).toEqual(['e1rm', 'weight', 'volume']);
  });

  test('give bodyweight exercises added weight and reps, never volume or e1RM', () => {
    expect(personalRecordKinds(bodyweight)).toEqual(['weight', 'reps']);
  });

  test('add duration and distance when tracked', () => {
    expect(personalRecordKinds({ loadType: 'none', tracksReps: false, tracksDuration: true, tracksDistance: true })).toEqual(['duration', 'distance']);
  });
});

describe('personal records', () => {
  const workouts = [
    { workoutId: 'w1', startedAt: new Date(2026, 10, 1), sets: [set(100000, 5), set(100000, 5)] },
    { workoutId: 'w2', startedAt: new Date(2026, 10, 3), sets: [set(105000, 2)] },
    { workoutId: 'w3', startedAt: new Date(2026, 10, 5), sets: [set(100000, 6)] },
  ];

  test('find the best value of each kind and the first workout that reached it', () => {
    expect(personalRecords(workouts, external)).toEqual([
      { kind: 'e1rm', value: 120000, workoutId: 'w3', startedAt: new Date(2026, 10, 5) },
      { kind: 'weight', value: 105000, workoutId: 'w2', startedAt: new Date(2026, 10, 3) },
      { kind: 'volume', value: 1000000, workoutId: 'w1', startedAt: new Date(2026, 10, 1) },
    ]);
  });

  test('mark only values above every earlier workout, and none in the first workout', () => {
    expect(newPersonalRecordsIn(workouts, external, 'w1')).toEqual([]);
    expect(newPersonalRecordsIn(workouts, external, 'w2')).toEqual([{ kind: 'weight', value: 105000 }]);
    expect(newPersonalRecordsIn(workouts, external, 'w3')).toEqual([{ kind: 'e1rm', value: 120000 }]);
  });

  test('ignore the bodyweight: the same dips at a higher bodyweight are no record', () => {
    const dips = [
      { workoutId: 'a', startedAt: new Date(2026, 10, 1), sets: [set(null, 5)] },
      { workoutId: 'b', startedAt: new Date(2026, 10, 8), sets: [set(null, 5)] },
    ];
    expect(newPersonalRecordsIn(dips, bodyweight, 'b')).toEqual([]);
    expect(personalRecords(dips, bodyweight)).toEqual([{ kind: 'reps', value: 5, workoutId: 'a', startedAt: new Date(2026, 10, 1) }]);
  });

  test('count added weight above zero only', () => {
    const assisted = [{ workoutId: 'a', startedAt: new Date(2026, 10, 1), sets: [set(-20000, 8)] }];
    expect(personalRecords(assisted, bodyweight).map((r) => r.kind)).toEqual(['reps']);
  });

  test('group rows by workout', () => {
    const rows = [
      { workoutId: 'w1', startedAt: new Date(2026, 10, 1), set: set(1, 1) },
      { workoutId: 'w1', startedAt: new Date(2026, 10, 1), set: set(2, 1) },
      { workoutId: 'w2', startedAt: new Date(2026, 10, 2), set: set(3, 1) },
    ];
    expect(byWorkout(rows).map((w) => [w.workoutId, w.sets.length])).toEqual([
      ['w1', 2],
      ['w2', 1],
    ]);
  });
});

describe('formatPersonalRecord', () => {
  test('show records in the exercise units', () => {
    expect(formatPersonalRecord('e1rm', 116667, 'external', kg)).toBe('116.65 kg');
    expect(formatPersonalRecord('weight', 20000, 'bodyweight', kg)).toBe('BW + 20 kg');
    expect(formatPersonalRecord('reps', 12, 'bodyweight', kg)).toBe('12');
    expect(formatPersonalRecord('duration', 90, 'none', kg)).toBe('1:30');
    expect(formatPersonalRecord('distance', 5000, 'none', kg)).toBe('5 km');
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
  const muscle = (id: string, role: 'primary' | 'secondary') => ({ id, name: id, role });
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
      { id: 'chest', name: 'chest', primarySets: 2, secondarySets: 1, volume: 1000000 + 720000 / 2, exercises: ['Bench Press', 'Dips'] },
      { id: 'triceps', name: 'triceps', primarySets: 2, secondarySets: 1, volume: 500000 + 720000, exercises: ['Bench Press', 'Dips'] },
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
