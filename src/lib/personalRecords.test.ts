import { describe, expect, test } from 'vitest';
import {
  byWorkout,
  estimatedOneRepMax,
  formatPersonalRecord,
  personalRecords,
  personalRecordKinds,
  newPersonalRecordsIn,
} from './personalRecords';

const kg = { weightUnit: 'kg', distanceUnit: 'metric' } as const;

const set = (weightGrams: number | null, reps: number | null, more: { durationSeconds?: number; distanceMeters?: number } = {}) => ({
  weightGrams,
  reps,
  durationSeconds: more.durationSeconds ?? null,
  distanceMeters: more.distanceMeters ?? null,
});

const external = { loadType: 'external', tracksReps: true, tracksDuration: false, tracksDistance: false } as const;

const bodyweight = { loadType: 'bodyweight', tracksReps: true, tracksDuration: false, tracksDistance: false } as const;

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
