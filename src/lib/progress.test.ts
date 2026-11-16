import { describe, expect, test } from 'vitest';
import type { HistoryRow } from '@/db/progress';
import type { WorkoutSet } from '@/db/schema';
import { chartCoordinates, chartMetrics, chartPoints, formatMetric, historyByWorkout, workoutValue } from './progress';

const set = (values: Partial<WorkoutSet>): WorkoutSet => ({
  id: crypto.randomUUID(),
  workoutExerciseId: 'we',
  position: 1,
  setType: 'normal',
  weightGrams: null,
  reps: null,
  durationSeconds: null,
  distanceMeters: null,
  rpe: null,
  restSeconds: null,
  notes: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...values,
});

const row = (workoutId: string, day: number, values: Partial<WorkoutSet>, workoutExerciseId = `${workoutId}-a`): HistoryRow => ({
  workoutId,
  startedAt: new Date(2026, 9, day),
  workoutExerciseId,
  workoutExerciseNotes: null,
  set: set(values),
});

describe('chartMetrics', () => {
  test('offer the values the exercise tracks', () => {
    expect(chartMetrics({ loadType: 'external', tracksReps: true, tracksDuration: false, tracksDistance: false })).toEqual(['weight', 'reps', 'volume']);
    expect(chartMetrics({ loadType: 'bodyweight', tracksReps: true, tracksDuration: false, tracksDistance: false })).toEqual(['weight', 'reps']);
    expect(chartMetrics({ loadType: 'none', tracksReps: false, tracksDuration: true, tracksDistance: true })).toEqual(['duration', 'distance']);
  });

  test('offer nothing for a note-only exercise', () => {
    expect(chartMetrics({ loadType: 'none', tracksReps: false, tracksDuration: false, tracksDistance: false })).toEqual([]);
  });
});

describe('workoutValue', () => {
  const sets = [
    set({ weightGrams: 60000, reps: 8, durationSeconds: 30 }),
    set({ weightGrams: 70000, reps: 5 }),
    set({ reps: 12, distanceMeters: 400 }),
  ];

  test('take the best set for weight, reps, duration and distance', () => {
    expect(workoutValue(sets, 'weight')).toBe(70000);
    expect(workoutValue(sets, 'reps')).toBe(12);
    expect(workoutValue(sets, 'duration')).toBe(30);
    expect(workoutValue(sets, 'distance')).toBe(400);
  });

  test('add up weight × reps for volume, skipping sets without both', () => {
    expect(workoutValue(sets, 'volume')).toBe(60000 * 8 + 70000 * 5);
  });

  test('return null when no set has the value', () => {
    expect(workoutValue([set({ reps: 5 })], 'weight')).toBeNull();
  });
});

describe('chartPoints', () => {
  test('give one point per workout, oldest first, and leave out workouts without the value', () => {
    const rows = [
      row('w1', 1, { weightGrams: 60000 }),
      row('w1', 1, { weightGrams: 65000 }),
      row('w2', 5, { reps: 10 }),
      row('w3', 9, { weightGrams: 70000 }),
    ];

    expect(chartPoints(rows, 'weight')).toEqual([
      { workoutId: 'w1', startedAt: new Date(2026, 9, 1), value: 65000 },
      { workoutId: 'w3', startedAt: new Date(2026, 9, 9), value: 70000 },
    ]);
  });
});

describe('formatMetric', () => {
  test('write values in the exercise’s units', () => {
    const lb = { weightUnit: 'lb', distanceUnit: 'imperial' } as const;
    expect(formatMetric(20412, 'weight', lb)).toBe('45 lb');
    expect(formatMetric(12, 'reps', lb)).toBe('12');
    expect(formatMetric(90, 'duration', lb)).toBe('1:30');
    expect(formatMetric(1609, 'distance', { weightUnit: 'kg', distanceUnit: 'metric' })).toBe('1.61 km');
  });
});

describe('historyByWorkout', () => {
  test('list workouts newest first, with workout exercises and sets in order', () => {
    const rows = [row('w1', 1, { reps: 1 }), row('w1', 1, { reps: 2 }), row('w1', 1, { reps: 3 }, 'w1-b'), row('w2', 5, { reps: 4 })];

    const history = historyByWorkout(rows);

    expect(history.map((workout) => workout.workoutId)).toEqual(['w2', 'w1']);
    expect(history[1].items.map((item) => item.sets.map((s) => s.reps))).toEqual([[1, 2], [3]]);
  });
});

describe('chartCoordinates', () => {
  const box = { width: 120, height: 70, padding: 10 };
  const point = (day: number, value: number) => ({ workoutId: String(day), startedAt: new Date(2026, 9, day), value });

  test('spread points by date and scale values from zero to the highest', () => {
    expect(chartCoordinates([point(1, 50), point(3, 100), point(11, 0)], box)).toEqual([
      { x: 10, y: 35 },
      { x: 30, y: 10 },
      { x: 110, y: 60 },
    ]);
  });

  test('put a single point in the middle, and handle no points', () => {
    expect(chartCoordinates([point(1, 0)], box)).toEqual([{ x: 60, y: 60 }]);
    expect(chartCoordinates([], box)).toEqual([]);
  });
});
